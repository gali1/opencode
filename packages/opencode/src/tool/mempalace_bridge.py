#!/usr/bin/env python3
"""
MemPalace bridge for OpenCode native tool integration.
Protocol: newline-delimited JSON over stdin/stdout.
Runs as a persistent subprocess — do not exit between requests.

Place this file at: packages/opencode/src/tool/mempalace_bridge.py
"""
import sys
import os
import json
import traceback

# ── Set palace path from environment BEFORE any mempalace imports ─────────
data_dir = os.environ.get("MEMPALACE_DATA_DIR", "")
if data_dir:
    os.makedirs(data_dir, exist_ok=True)
    os.environ["MEMPALACE_PALACE_PATH"] = data_dir

# ── Stdout protection ────────────────────────────────────────────────────
# Same pattern as mempalace/mcp_server.py (issue #225): redirect stdout →
# stderr at both the fd and Python level before heavy imports, so chromadb /
# onnxruntime banners don't corrupt our JSON protocol. We restore the real
# stdout after imports are complete.
_REAL_STDOUT = sys.stdout
_REAL_STDOUT_FD = None
try:
    _REAL_STDOUT_FD = os.dup(1)
    os.dup2(2, 1)
except (OSError, AttributeError):
    pass
sys.stdout = sys.stderr

# ── Import mempalace tool handlers ────────────────────────────────────────
_IMPORT_ERROR = None
_kg = None
_config = None
try:
    from mempalace import mcp_server as _mcp_mod
    from mempalace.searcher import search_memories

    tool_status = _mcp_mod.tool_status
    tool_list_wings = _mcp_mod.tool_list_wings
    tool_list_rooms = _mcp_mod.tool_list_rooms
    tool_search = _mcp_mod.tool_search
    tool_add_drawer = _mcp_mod.tool_add_drawer
    tool_kg_add = _mcp_mod.tool_kg_add
    tool_kg_query = _mcp_mod.tool_kg_query
    tool_kg_invalidate = _mcp_mod.tool_kg_invalidate
    tool_diary_write = _mcp_mod.tool_diary_write
    tool_diary_read = _mcp_mod.tool_diary_read
    _kg = _mcp_mod._kg
    _config = _mcp_mod._config
except ImportError as e:
    _IMPORT_ERROR = str(e)

# ── Import advanced retriever (lives alongside this bridge script) ────────
_RETRIEVER_ERROR = None
try:
    # The retriever module is in the same directory as this bridge script
    import importlib.util
    _bridge_dir = os.path.dirname(os.path.abspath(__file__))
    _spec = importlib.util.spec_from_file_location(
        "mempalace_retriever",
        os.path.join(_bridge_dir, "mempalace_retriever.py"),
    )
    _retriever_mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_retriever_mod)
    adaptive_search = _retriever_mod.adaptive_search
    contradiction_check = _retriever_mod.contradiction_check
    fact_check = _retriever_mod.fact_check
    multi_hop_query = _retriever_mod.multi_hop_query
except Exception as e:
    _RETRIEVER_ERROR = str(e)
    adaptive_search = None
    contradiction_check = None
    fact_check = None
    multi_hop_query = None

# ── Restore real stdout for JSON protocol output ─────────────────────────
if _REAL_STDOUT_FD is not None:
    try:
        os.dup2(_REAL_STDOUT_FD, 1)
        os.close(_REAL_STDOUT_FD)
    except OSError:
        pass
    _REAL_STDOUT_FD = None
sys.stdout = _REAL_STDOUT


# ── Operation handlers ───────────────────────────────────────────────────
# Each handler receives the full request dict and returns a result dict.
# Parameter names are translated from the LLM-facing schema (entity /
# relation / target) to the mempalace API names (subject / predicate /
# object) where necessary.

def handle_search(params):
    return tool_search(
        query=params.get("query", ""),
        limit=int(params.get("limit", 5)),
        wing=params.get("wing") or None,
        room=params.get("room") or None,
    )


def handle_smart_search(params):
    """Adaptive two-phase retrieval that scales to large palaces."""
    if adaptive_search is None:
        return {
            "error": f"Advanced retriever not available: {_RETRIEVER_ERROR}",
            "hint": "Falling back to standard search",
        }
    palace_path = _config.palace_path if _config else data_dir
    vector_off = False
    try:
        vector_off = _mcp_mod._vector_disabled
    except Exception:
        pass
    return adaptive_search(
        query=params.get("query", ""),
        palace_path=palace_path,
        wing=params.get("wing") or None,
        room=params.get("room") or None,
        n_results=int(params.get("limit", 5)),
        kg=_kg,
        vector_disabled=vector_off,
        expand_with_kg=params.get("expand_with_kg", True),
    )


def handle_contradiction_check(params):
    """Find facts that contradict a given statement."""
    if contradiction_check is None:
        return {
            "error": f"Advanced retriever not available: {_RETRIEVER_ERROR}",
        }
    palace_path = _config.palace_path if _config else data_dir
    return contradiction_check(
        statement=params.get("statement", params.get("content", "")),
        entity=params.get("entity") or None,
        kg=_kg,
        palace_path=palace_path,
        search_memories_fn=search_memories if "search_memories" in dir() else None,
    )


def handle_fact_check(params):
    """Validate a claim against the knowledge graph and stored memories."""
    if fact_check is None:
        return {
            "error": f"Advanced retriever not available: {_RETRIEVER_ERROR}",
        }
    palace_path = _config.palace_path if _config else data_dir
    vector_off = False
    try:
        vector_off = _mcp_mod._vector_disabled
    except Exception:
        pass
    return fact_check(
        claim=params.get("claim", params.get("content", "")),
        kg=_kg,
        palace_path=palace_path,
        search_memories_fn=search_memories if "search_memories" in dir() else None,
        vector_disabled=vector_off,
    )


def handle_multi_hop(params):
    """Multi-hop graph traversal between entities."""
    if multi_hop_query is None:
        return {
            "error": f"Advanced retriever not available: {_RETRIEVER_ERROR}",
        }
    return multi_hop_query(
        start_entity=params.get("entity", ""),
        target_entity=params.get("target") or None,
        max_hops=int(params.get("depth", 3)),
        kg=_kg,
    )


def handle_store(params):
    return tool_add_drawer(
        wing=params.get("wing", "project"),
        room=params.get("room", "general"),
        content=params.get("content", ""),
        source_file=params.get("drawer") or None,
        added_by="opencode-agent",
    )


def handle_status(params):
    return tool_status()


def handle_list_wings(params):
    return tool_list_wings()


def handle_list_rooms(params):
    return tool_list_rooms(wing=params.get("wing") or None)


def handle_kg_add(params):
    return tool_kg_add(
        subject=params.get("entity", ""),
        predicate=params.get("relation", ""),
        object=params.get("target", ""),
        valid_from=params.get("valid_from"),
        source_closet=params.get("source_closet"),
    )


def handle_kg_query(params):
    return tool_kg_query(
        entity=params.get("entity", ""),
        as_of=params.get("as_of"),
        direction=params.get("direction", "both"),
    )


def handle_kg_invalidate(params):
    return tool_kg_invalidate(
        subject=params.get("entity", ""),
        predicate=params.get("relation", ""),
        object=params.get("target", ""),
        ended=params.get("ended"),
    )


def handle_diary_write(params):
    return tool_diary_write(
        agent_name=params.get("agent_name", "opencode"),
        entry=params.get("entry", ""),
        topic=params.get("topic", "general"),
        wing=params.get("wing", ""),
    )


def handle_diary_read(params):
    return tool_diary_read(
        agent_name=params.get("agent_name", "opencode"),
        last_n=int(params.get("limit", 10)),
        wing=params.get("wing", ""),
    )


HANDLERS = {
    "search": handle_search,
    "smart_search": handle_smart_search,
    "store": handle_store,
    "status": handle_status,
    "list_wings": handle_list_wings,
    "list_rooms": handle_list_rooms,
    "kg_add": handle_kg_add,
    "kg_query": handle_kg_query,
    "kg_invalidate": handle_kg_invalidate,
    "contradiction_check": handle_contradiction_check,
    "fact_check": handle_fact_check,
    "multi_hop": handle_multi_hop,
    "diary_write": handle_diary_write,
    "diary_read": handle_diary_read,
}


def _write_response(response):
    """Write a JSON response to stdout, terminated by newline."""
    sys.stdout.write(json.dumps(response, default=str) + "\n")
    sys.stdout.flush()


def main():
    # If mempalace failed to import, signal the error and exit
    if _IMPORT_ERROR is not None:
        _write_response({
            "status": "error",
            "message": f"mempalace import failed: {_IMPORT_ERROR}. "
                       "Install with: pip install mempalace",
        })
        sys.exit(1)

    # Signal readiness (include retriever status)
    ready_data = "ready"
    if _RETRIEVER_ERROR:
        ready_data = f"ready (advanced retriever unavailable: {_RETRIEVER_ERROR})"
    _write_response({"status": "ok", "data": ready_data})

    # Main request loop — read one JSON object per line from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            operation = request.get("operation")
            handler = HANDLERS.get(operation)
            if handler is None:
                response = {
                    "status": "error",
                    "message": f"Unknown operation: {operation}. "
                               f"Valid operations: {', '.join(sorted(HANDLERS.keys()))}",
                }
            else:
                result = handler(request)
                response = {"status": "ok", "data": result}
        except Exception:
            response = {
                "status": "error",
                "message": traceback.format_exc(),
            }

        _write_response(response)


if __name__ == "__main__":
    main()