#!/usr/bin/env python3
"""
MemPalace bridge for OpenCode — unified MemPalace + Rekal engine.
Protocol: newline-delimited JSON over stdin/stdout.

Place at: packages/opencode/src/tool/mempalace_bridge.py
"""
import sys
import os
import json
import traceback

data_dir = os.environ.get("MEMPALACE_DATA_DIR", "")
if data_dir:
    os.makedirs(data_dir, exist_ok=True)
    os.environ["MEMPALACE_PALACE_PATH"] = data_dir

# ── Stdout protection ────────────────────────────────────────────────────
_REAL_STDOUT = sys.stdout
_REAL_STDOUT_FD = None
try:
    _REAL_STDOUT_FD = os.dup(1)
    os.dup2(2, 1)
except (OSError, AttributeError):
    pass
sys.stdout = sys.stderr

# ── Imports ──────────────────────────────────────────────────────────────
_IMPORT_ERROR = None
_mcp_mod = None
_kg = None
_config = None
_search_memories = None

try:
    from mempalace import mcp_server as _mcp_mod
    from mempalace.searcher import search_memories as _search_memories_fn
    # mempalace 3.6.x: _kg/_config are module-level singletons or classes
    _kg = getattr(_mcp_mod, "_kg", None) or getattr(_mcp_mod, "KnowledgeGraph", None)
    _config = getattr(_mcp_mod, "_config", None) or getattr(_mcp_mod, "MempalaceConfig", None)
    if callable(_config) and not isinstance(_config, dict):
        try:
            _config = _config()
        except Exception:
            pass
    _search_memories = _search_memories_fn
except Exception as e:
    _IMPORT_ERROR = str(e)

# ── Rekal engine ─────────────────────────────────────────────────────────
_ENGINE = None
_ENGINE_ERROR = None

if _IMPORT_ERROR is None:
    try:
        import importlib.util
        _bridge_dir = os.path.dirname(os.path.abspath(__file__))
        _spec = importlib.util.spec_from_file_location(
            "mempalace_rekal_engine",
            os.path.join(_bridge_dir, "mempalace_rekal_engine.py"),
        )
        _engine_mod = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(_engine_mod)
        _RekalEngine = _engine_mod.RekalEngine

        if _config and hasattr(_config, 'palace_path') and not _config.palace_path:
            _config.palace_path = data_dir
        palace_path = (_config.palace_path if _config else data_dir) or data_dir
        _ENGINE = _RekalEngine(
            data_dir=data_dir,
            palace_path=palace_path,
            kg=_kg,
            search_memories_fn=_search_memories,
        )
    except Exception as e:
        _ENGINE_ERROR = str(e)

# ── Restore stdout ───────────────────────────────────────────────────────
if _REAL_STDOUT_FD is not None:
    try:
        os.dup2(_REAL_STDOUT_FD, 1)
        os.close(_REAL_STDOUT_FD)
    except OSError:
        pass
    _REAL_STDOUT_FD = None
sys.stdout = _REAL_STDOUT


# ══════════════════════════════════════════════════════════════════════════
#  Handlers — MemPalace native tools (unchanged, use mcp_server directly)
# ══════════════════════════════════════════════════════════════════════════

def handle_search(p):
    return _mcp_mod.tool_search(
        query=p.get("query", ""), limit=int(p.get("limit", 5)),
        wing=p.get("wing") or None, room=p.get("room") or None,
    )

def handle_store(p):
    return _mcp_mod.tool_add_drawer(
        wing=p.get("wing", "project"), room=p.get("room", "general"),
        content=p.get("content", ""), source_file=p.get("drawer") or None,
        added_by="opencode-agent",
    )

def handle_status(p):
    return _mcp_mod.tool_status()

def handle_list_wings(p):
    return _mcp_mod.tool_list_wings()

def handle_list_rooms(p):
    return _mcp_mod.tool_list_rooms(wing=p.get("wing") or None)

def handle_kg_add(p):
    return _mcp_mod.tool_kg_add(
        subject=p.get("entity", ""), predicate=p.get("relation", ""),
        object=p.get("target", ""), valid_from=p.get("valid_from"),
    )

def handle_kg_query(p):
    return _mcp_mod.tool_kg_query(
        entity=p.get("entity", ""), as_of=p.get("as_of"),
        direction=p.get("direction", "both"),
    )

def handle_kg_invalidate(p):
    return _mcp_mod.tool_kg_invalidate(
        subject=p.get("entity", ""), predicate=p.get("relation", ""),
        object=p.get("target", ""), ended=p.get("ended"),
    )

def handle_diary_write(p):
    return _mcp_mod.tool_diary_write(
        agent_name=p.get("agent_name", "opencode"), entry=p.get("entry", ""),
        topic=p.get("topic", "general"), wing=p.get("wing", ""),
    )

def handle_diary_read(p):
    return _mcp_mod.tool_diary_read(
        agent_name=p.get("agent_name", "opencode"),
        last_n=int(p.get("limit", 10)), wing=p.get("wing", ""),
    )


# ══════════════════════════════════════════════════════════════════════════
#  Handlers — Rekal engine operations
# ══════════════════════════════════════════════════════════════════════════

def handle_session_init(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.session_init(
        task=p.get("query", p.get("task", "")),
        project=p.get("project"),
        limit=int(p.get("limit", 10)),
        w_fts=p.get("w_fts"), w_vec=p.get("w_vec"),
        w_recency=p.get("w_recency"), half_life=p.get("half_life"),
    )

def handle_ingest_turns(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.ingest_turns(
        turns=p.get("turns", p.get("content", "")),
        project=p.get("project"),
        wing=p.get("wing"),
        room=p.get("room"),
    )

def _require_engine():
    if _ENGINE is None:
        return {"error": f"Rekal engine not available: {_ENGINE_ERROR or 'unknown'}"}
    return None

def handle_memory_store(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.store(
        content=p.get("content", ""),
        memory_type=p.get("memory_type", "fact"),
        project=p.get("project"), wing=p.get("wing"),
        room=p.get("room"), tags=p.get("tags"),
    )

def handle_memory_search(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.search(
        query=p.get("query", ""), limit=int(p.get("limit", 10)),
        project=p.get("project"), memory_type=p.get("memory_type"),
        wing=p.get("wing"), room=p.get("room"),
        w_fts=p.get("w_fts"), w_vec=p.get("w_vec"),
        w_recency=p.get("w_recency"), half_life=p.get("half_life"),
    )

def handle_memory_update(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.update(
        memory_id=p.get("memory_id", ""),
        content=p.get("content"), tags=p.get("tags"),
        memory_type=p.get("memory_type"),
    )

def handle_memory_supersede(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.supersede(
        old_id=p.get("old_id", ""),
        new_content=p.get("content", ""),
        memory_type=p.get("memory_type"),
        project=p.get("project"), wing=p.get("wing"),
        room=p.get("room"), tags=p.get("tags"),
    )

def handle_memory_delete(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.delete(memory_id=p.get("memory_id", ""))

def handle_memory_link(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.link(
        from_id=p.get("from_id", ""), to_id=p.get("to_id", ""),
        relation=p.get("link_relation", "related_to"),
    )

def handle_build_context(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.build_context(
        query=p.get("query", ""), project=p.get("project"),
        limit=int(p.get("limit", 10)),
        w_fts=p.get("w_fts"), w_vec=p.get("w_vec"),
        w_recency=p.get("w_recency"), half_life=p.get("half_life"),
    )

def handle_memory_conflicts(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.get_conflicts(project=p.get("project"))

def handle_memory_health(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.health()

def handle_memory_similar(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.similar(memory_id=p.get("memory_id", ""), limit=int(p.get("limit", 5)))

def handle_memory_topics(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.topics(project=p.get("project"))

def handle_memory_timeline(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.timeline(
        project=p.get("project"), start=p.get("start"),
        end=p.get("end"), limit=int(p.get("limit", 20)),
    )

def handle_memory_related(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.related(memory_id=p.get("memory_id", ""))

def handle_contradiction_check(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.contradiction_check(
        statement=p.get("statement", p.get("content", "")),
        entity=p.get("entity"),
    )

def handle_fact_check(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.fact_check(claim=p.get("claim", p.get("content", "")))

def handle_multi_hop(p):
    err = _require_engine()
    if err: return err
    return _ENGINE.multi_hop(
        start_entity=p.get("entity", ""),
        target_entity=p.get("target"),
        max_hops=int(p.get("depth", 3)),
    )

def handle_set_config(p):
    err = _require_engine()
    if err: return err
    project = p.get("project")
    if not project:
        return {"error": "project is required for set_config"}
    return _ENGINE.set_config(project, p.get("key", ""), p.get("value", ""))


# ══════════════════════════════════════════════════════════════════════════
#  Handler registry
# ══════════════════════════════════════════════════════════════════════════

HANDLERS = {
    # MemPalace native (drawer-level)
    "search": handle_search,
    "store": handle_store,
    "status": handle_status,
    "list_wings": handle_list_wings,
    "list_rooms": handle_list_rooms,
    "kg_add": handle_kg_add,
    "kg_query": handle_kg_query,
    "kg_invalidate": handle_kg_invalidate,
    "diary_write": handle_diary_write,
    "diary_read": handle_diary_read,
    # Rekal engine (structured memory)
    "memory_store": handle_memory_store,
    "memory_search": handle_memory_search,
    "memory_update": handle_memory_update,
    "memory_supersede": handle_memory_supersede,
    "memory_delete": handle_memory_delete,
    "memory_link": handle_memory_link,
    "build_context": handle_build_context,
    "memory_conflicts": handle_memory_conflicts,
    "memory_health": handle_memory_health,
    "memory_similar": handle_memory_similar,
    "memory_topics": handle_memory_topics,
    "memory_timeline": handle_memory_timeline,
    "memory_related": handle_memory_related,
    "contradiction_check": handle_contradiction_check,
    "fact_check": handle_fact_check,
    "multi_hop": handle_multi_hop,
    "set_config": handle_set_config,
    "session_init": handle_session_init,
    "ingest_turns": handle_ingest_turns,
}


def _write(response):
    sys.stdout.write(json.dumps(response, default=str) + "\n")
    sys.stdout.flush()


def main():
    if _IMPORT_ERROR is not None:
        _write({"status": "error", "message": f"mempalace import failed: {_IMPORT_ERROR}. Install with: pip install mempalace"})
        sys.exit(1)

    status = "ready"
    if _ENGINE_ERROR:
        status = f"ready (rekal engine unavailable: {_ENGINE_ERROR})"
    _write({"status": "ok", "data": status})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            op = request.get("operation")
            handler = HANDLERS.get(op)
            if handler is None:
                response = {"status": "error", "message": f"Unknown operation: {op}. Valid: {', '.join(sorted(HANDLERS.keys()))}"}
            else:
                result = handler(request)
                response = {"status": "ok", "data": result}
        except Exception:
            response = {"status": "error", "message": traceback.format_exc()}
        _write(response)


if __name__ == "__main__":
    main()