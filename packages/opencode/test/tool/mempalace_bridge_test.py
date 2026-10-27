"""Tests for the MemPalace bridge's capability gating.

Covers the two optional memory features as independent capabilities:
  * MemPalace (external `mempalace` package) backs the native drawer operations.
  * The bundled memory enhancement backs the `memory_*` operations and must keep
    working when the external package is absent.

Run directly:      python3 packages/opencode/test/tool/mempalace_bridge_test.py
Or under pytest:   pytest packages/opencode/test/tool/mempalace_bridge_test.py
"""

import json
import os
import subprocess
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_TOOL_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "src", "tool"))
_BRIDGE = os.path.join(_TOOL_DIR, "mempalace_bridge.py")

_FAILURES = []


def check(name, condition, detail=""):
    if condition:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        _FAILURES.append(name)


def _shadow_without_mempalace():
    """Create a PYTHONPATH entry whose `mempalace` raises on import."""
    root = tempfile.mkdtemp(prefix="no-mempalace-")
    package = os.path.join(root, "mempalace")
    os.makedirs(package, exist_ok=True)
    with open(os.path.join(package, "__init__.py"), "w", encoding="utf-8") as handle:
        handle.write("raise ImportError('simulated: mempalace not installed')\n")
    return root


def run_bridge(operations, flags=None, without_mempalace=True):
    """Run the bridge over stdin and return its parsed JSON responses."""
    data_dir = tempfile.mkdtemp(prefix="bridge-data-")
    xdg = tempfile.mkdtemp(prefix="bridge-xdg-")
    if flags is not None:
        os.makedirs(os.path.join(xdg, "opencode"), exist_ok=True)
        with open(os.path.join(xdg, "opencode", "memory-config.json"), "w", encoding="utf-8") as handle:
            json.dump(flags, handle)

    env = dict(os.environ)
    env["MEMPALACE_DATA_DIR"] = data_dir
    env["XDG_DATA_HOME"] = xdg
    env.pop("PYTHONPATH", None)
    if without_mempalace:
        env["PYTHONPATH"] = _shadow_without_mempalace()

    payload = "".join(json.dumps(op) + "\n" for op in operations)
    proc = subprocess.run(
        [sys.executable, "-B", _BRIDGE],
        input=payload,
        text=True,
        capture_output=True,
        env=env,
        timeout=180,
    )

    responses = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            responses.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return proc, responses


def status_of(response):
    return response.get("status")


def message_of(response):
    return str(response.get("message", ""))


# ── Startup ───────────────────────────────────────────────────────────────

def test_startup_without_mempalace():
    print("startup without mempalace")

    proc, responses = run_bridge([], without_mempalace=True)
    check("bridge process exits cleanly", proc.returncode == 0, f"rc={proc.returncode}")
    check("startup reports ok", responses and status_of(responses[0]) == "ok")
    startup = responses[0].get("data", "") if responses else ""
    check("startup names the missing package", "mempalace unavailable" in str(startup), f"got {startup!r}")
    check("capabilities reported", isinstance(responses[0].get("capabilities"), dict))


def test_startup_with_mempalace_present():
    print("startup with mempalace present")

    try:
        import mempalace  # noqa: F401
    except Exception:
        print("  skip (mempalace package not installed on this machine)")
        return

    proc, responses = run_bridge([], without_mempalace=False)
    check("bridge process exits cleanly", proc.returncode == 0)
    check("startup reports ok", responses and status_of(responses[0]) == "ok")
    check("startup does not report a missing package",
          "unavailable" not in str(responses[0].get("data", "")),
          f"got {responses[0].get('data')!r}")


# ── Independence ─────────────────────────────────────────────────────────

def test_enhancement_works_without_mempalace():
    print("memory enhancement without mempalace")

    proc, responses = run_bridge(
        [
            {"operation": "memory_store", "content": "The cache uses redis", "project": "p"},
            {"operation": "memory_recall", "query": "cache", "project": "p"},
        ],
        flags={"mempalace": False, "enhancement": True},
        without_mempalace=True,
    )
    check("bridge stays up", proc.returncode == 0)
    check("store succeeds without mempalace", responses[1]["status"] == "ok", f"got {responses[1]}")
    check("recall succeeds without mempalace", responses[2]["status"] == "ok", f"got {responses[2]}")
    results = responses[2].get("data", {}).get("results", [])
    check("stored memory is retrievable", any("redis" in str(r.get("content", "")) for r in results))


def test_native_ops_require_mempalace():
    print("native operations require mempalace")

    proc, responses = run_bridge(
        [{"operation": "store", "content": "a drawer"}, {"operation": "status"}],
        flags={"mempalace": True, "enhancement": True},
        without_mempalace=True,
    )
    check("bridge stays up", proc.returncode == 0)
    check("store reports a clear error", responses[1]["status"] == "error")
    check("error explains how to fix it", "pip install mempalace" in message_of(responses[1]))
    check("status reports a clear error", responses[2]["status"] == "error")


# ── Installer flags ──────────────────────────────────────────────────────

def test_both_disabled():
    print("both features disabled")

    proc, responses = run_bridge(
        [
            {"operation": "memory_store", "content": "x", "project": "p"},
            {"operation": "store", "content": "y"},
        ],
        flags={"mempalace": False, "enhancement": False},
    )
    check("bridge stays up", proc.returncode == 0)
    check("startup notes all features disabled", "all optional memory features disabled" in str(responses[0].get("data", "")))
    check("enhancement op blocked", "Memory enhancement is disabled" in message_of(responses[1]))
    check("mempalace op blocked", "MemPalace is disabled" in message_of(responses[2]))


def test_enhancement_only_flag_blocks_enhancement():
    print("enhancement declined, mempalace accepted")

    proc, responses = run_bridge(
        [{"operation": "memory_health"}],
        flags={"mempalace": True, "enhancement": False},
        without_mempalace=True,
    )
    check("enhancement op blocked", responses[1]["status"] == "error")
    check("message mentions re-running the installer", "source installer" in message_of(responses[1]))


def test_missing_config_defaults_to_enabled():
    print("missing config file (backward compatibility)")

    proc, responses = run_bridge(
        [{"operation": "memory_store", "content": "legacy default", "project": "p"}],
        flags=None,
        without_mempalace=True,
    )
    check("startup succeeds", status_of(responses[0]) == "ok")
    check("both capabilities default on", responses[0].get("capabilities") == {"mempalace": True, "enhancement": True})
    check("enhancement usable with no config file", responses[1]["status"] == "ok")


def test_malformed_config_is_ignored():
    print("malformed config file")

    data_dir = tempfile.mkdtemp(prefix="bridge-data-")
    xdg = tempfile.mkdtemp(prefix="bridge-xdg-")
    os.makedirs(os.path.join(xdg, "opencode"), exist_ok=True)
    with open(os.path.join(xdg, "opencode", "memory-config.json"), "w", encoding="utf-8") as handle:
        handle.write("{not valid json")

    env = dict(os.environ)
    env["MEMPALACE_DATA_DIR"] = data_dir
    env["XDG_DATA_HOME"] = xdg
    env.pop("PYTHONPATH", None)
    env["PYTHONPATH"] = _shadow_without_mempalace()

    proc = subprocess.run(
        [sys.executable, "-B", _BRIDGE],
        input=json.dumps({"operation": "memory_store", "content": "still works", "project": "p"}) + "\n",
        text=True,
        capture_output=True,
        env=env,
        timeout=180,
    )
    responses = [json.loads(line) for line in proc.stdout.splitlines() if line.strip().startswith("{")]
    check("bridge survives a malformed config", proc.returncode == 0 and responses)
    check("defaults apply when config is unreadable", responses[0].get("capabilities") == {"mempalace": True, "enhancement": True})
    check("operations still work", responses[1]["status"] == "ok", f"got {responses[1]}")


def main():
    for test in (
        test_startup_without_mempalace,
        test_startup_with_mempalace_present,
        test_enhancement_works_without_mempalace,
        test_native_ops_require_mempalace,
        test_both_disabled,
        test_enhancement_only_flag_blocks_enhancement,
        test_missing_config_defaults_to_enabled,
        test_malformed_config_is_ignored,
    ):
        test()

    print()
    if _FAILURES:
        print(f"FAILED: {len(_FAILURES)} check(s): {', '.join(_FAILURES)}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
