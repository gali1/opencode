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
try:
    from mempalace.mcp_server import (
        tool_status,
        tool_list_wings,
        tool_list_rooms,
        tool_search,
        tool_add_drawer,
        tool_kg_add,
        tool_kg_query,
        tool_kg_invalidate,
        tool_diary_write,
        tool_diary_read,
    )
except ImportError as e:
    _IMPORT_ERROR = str(e)

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
    "store": handle_store,
    "status": handle_status,
    "list_wings": handle_list_wings,
    "list_rooms": handle_list_rooms,
    "kg_add": handle_kg_add,
    "kg_query": handle_kg_query,
    "kg_invalidate": handle_kg_invalidate,
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

    # Signal readiness
    _write_response({"status": "ok", "data": "ready"})

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
