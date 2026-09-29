"""Integration tests for the Rekal memory engine.

Covers the non-regression contract (the baseline search path must be unchanged)
and the opt-in Hindsight-derived capabilities layered on top of it.

These tests drive a real SQLite database in a temp directory. The ChromaDB
vector side is exercised opportunistically: when `mempalace` is installed the
engine writes drawers as a side effect, and when it is not the engine degrades
to FTS-only, which is itself one of the behaviours under test.

Run directly:      python3 packages/opencode/test/tool/mempalace_rekal_test.py
Or under pytest:   pytest packages/opencode/test/tool/mempalace_rekal_test.py
"""

import os
import sqlite3
import sys
import tempfile

# Redirect the MemPalace/ChromaDB side to a throwaway directory BEFORE the
# engine imports it. The Rekal engine mirrors every store into Chroma, and
# without this the suite would write drawers into the developer's real palace.
_PALACE = tempfile.mkdtemp(prefix="rekal-test-palace-")
os.environ.setdefault("MEMPALACE_PALACE_PATH", _PALACE)
os.environ.setdefault("MEMPALACE_DATA_DIR", _PALACE)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src", "tool"))

from mempalace_rekal_engine import RekalEngine, _quote_fts  # noqa: E402

_FAILURES = []


def check(name, condition, detail=""):
    if condition:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        _FAILURES.append(name)


def engine():
    return RekalEngine(tempfile.mkdtemp())


# ── Non-regression: the baseline contract ─────────────────────────────────

def test_baseline_unchanged():
    print("baseline search contract (non-regression)")

    eng = engine()
    for text in ("Session storage uses SQLite WAL", "Retry uses exponential backoff"):
        eng.store(text, project="p")

    result = eng.search("storage", limit=5, project="p")
    check("envelope keys unchanged",
          sorted(result.keys()) == ["query", "results", "total_candidates", "weights"],
          f"got {sorted(result.keys())}")
    check("no advanced-retrieval key on the default path", "retrieval" not in result)

    row = result["results"][0]
    for field in ("id", "content", "memory_type", "project", "wing", "room", "tags",
                  "importance", "created_at", "updated_at", "access_count",
                  "score", "fts_score", "vec_score", "recency_score", "access_score", "source"):
        check(f"result field preserved: {field}", field in row)

    check("no rrf fields leak into the baseline path", "rrf_score" not in row)
    check("weights envelope preserved",
          set(result["weights"]) >= {"w_fts", "w_vec", "w_recency", "half_life"})

    check("baseline FTS keeps AND semantics", _quote_fts("alpha beta") == '"alpha"* "beta"*')
    check("opt-in FTS uses OR", _quote_fts("alpha beta", match_any=True) == '"alpha"* OR "beta"*')


def test_existing_operations_still_work():
    print("existing operations (non-regression)")

    eng = engine()
    first = eng.store("Original content about caching", project="p")["memory_id"]
    second = eng.store("Second memory about indexing", project="p")["memory_id"]

    check("store returns success", bool(first))
    check("get returns the row", eng.get(first)["content"] == "Original content about caching")
    check("update succeeds", eng.update(first, content="Updated content about caching")["success"])
    check("update is visible", "Updated" in eng.get(first)["content"])
    check("link succeeds", eng.link(first, second, "related_to")["success"])
    check("related finds the link", len(eng.related(first)) >= 1)

    superseded = eng.supersede(first, "Superseded content about caching", project="p")
    check("supersede returns a new id", superseded.get("new_id") or superseded.get("memory_id"))

    check("health reports totals", eng.health()["total_memories"] >= 2)
    check("topics returns a structure", isinstance(eng.topics("p"), (dict, list)))
    check("timeline returns a structure", isinstance(eng.timeline("p"), (dict, list)))
    check("delete succeeds", eng.delete(second)["success"])
    check("deleted row is gone", eng.get(second) is None or eng.get(second) == {})


# ── Schema migration and backward compatibility ───────────────────────────

def test_migration_from_pre_upgrade_db():
    print("migration from a pre-upgrade database")

    directory = tempfile.mkdtemp()
    path = os.path.join(directory, "rekal_memories.db")

    # Build a database with the OLD schema: no proof_count, no last_reinforced_at.
    old = sqlite3.connect(path)
    old.executescript(
        """
        CREATE TABLE memories (
            id TEXT PRIMARY KEY, content TEXT NOT NULL, content_hash TEXT,
            memory_type TEXT NOT NULL DEFAULT 'fact', project TEXT, wing TEXT, room TEXT,
            tags TEXT, importance REAL NOT NULL DEFAULT 0.5,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            access_count INTEGER NOT NULL DEFAULT 0, last_accessed_at TEXT);
        CREATE TABLE memory_links (
            from_id TEXT NOT NULL, to_id TEXT NOT NULL, relation TEXT NOT NULL,
            created_at TEXT NOT NULL, PRIMARY KEY (from_id, to_id, relation));
        CREATE TABLE rekal_config (
            project TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
            PRIMARY KEY (project, key));
        INSERT INTO memories (id, content, content_hash, memory_type, created_at, updated_at)
        VALUES ('legacy1', 'A memory written before the upgrade', 'hash-legacy', 'fact',
                '2020-01-01 00:00:00', '2020-01-01 00:00:00');
        """
    )
    old.commit()
    old.close()

    eng = RekalEngine(directory)
    columns = {row[1] for row in eng.db.execute("PRAGMA table_info(memories)")}
    check("proof_count added by migration", "proof_count" in columns)
    check("last_reinforced_at added by migration", "last_reinforced_at" in columns)

    legacy = eng.get("legacy1")
    check("pre-existing row survives", legacy is not None and "before the upgrade" in legacy["content"])
    check("pre-existing row defaults to neutral evidence", legacy.get("proof_count") == 1)

    check("legacy rows are searchable", isinstance(eng.search("upgrade", limit=5), dict))
    check("legacy rows work under advanced retrieval",
          isinstance(eng.search("upgrade", limit=5, fusion="rrf"), dict))

    # Re-opening must be idempotent.
    reopened = RekalEngine(directory)
    check("re-running migrations is idempotent", reopened.get("legacy1") is not None)


# ── Evidence accumulation ─────────────────────────────────────────────────

def test_proof_accumulation():
    print("evidence accumulation")

    eng = engine()
    text = "The deploy script requires an explicit region flag"

    first = eng.store(text, project="p")
    check("first store is not a duplicate", not first.get("duplicate"))

    second = eng.store(text, project="p")
    check("second store is detected as duplicate", second.get("duplicate") is True)
    check("duplicate returns the original id", second["memory_id"] == first["memory_id"])
    check("duplicate reinforces evidence", second.get("proof_count") == 2)

    third = eng.store(text, project="p")
    check("evidence keeps accumulating", third.get("proof_count") == 3)

    stored = eng.get(first["memory_id"])
    check("proof_count persisted", stored.get("proof_count") == 3)
    check("reinforcement timestamp recorded", stored.get("last_reinforced_at"))
    check("content is not duplicated in the store",
          eng.db.execute("SELECT COUNT(*) FROM memories WHERE content = ?", (text,)).fetchone()[0] == 1)


# ── Contradiction detection ───────────────────────────────────────────────

def test_contradiction_links():
    print("automatic contradiction detection")

    eng = engine()
    original = eng.store("The API gateway uses mutual TLS for all traffic", project="p")
    check("baseline store has no conflicts", not original.get("contradicts"))

    conflicting = eng.store("The API gateway does not use mutual TLS for all traffic", project="p")
    check("contradiction detected on store", bool(conflicting.get("contradicts")))
    check("contradiction references the original",
          any(c["memory_id"] == original["memory_id"] for c in conflicting.get("contradicts", [])))
    check("contradiction carries a confidence",
          all(0.0 < c["confidence"] <= 0.95 for c in conflicting.get("contradicts", [])))

    links = eng.db.execute("SELECT COUNT(*) FROM memory_links WHERE relation='contradicts'").fetchone()[0]
    check("contradicts link persisted", links >= 1)

    conflicts = eng.get_conflicts("p")
    reported = conflicts.get("conflicts", []) if isinstance(conflicts, dict) else conflicts
    check("memory_conflicts now reports a conflict", len(reported) >= 1,
          f"got {reported!r}")

    check("both memories are retained (nothing deleted)",
          eng.get(original["memory_id"]) is not None and eng.get(conflicting["memory_id"]) is not None)

    unrelated = eng.store("Billing reconciliation runs nightly at 02:00 UTC", project="p")
    check("unrelated content creates no false conflict", not unrelated.get("contradicts"))


# ── Advanced retrieval ────────────────────────────────────────────────────

def test_rank_fusion():
    print("rank fusion")

    eng = engine()
    for text in ("Session storage uses SQLite with WAL mode",
                 "Retry policy uses exponential backoff",
                 "Auth tokens expire after thirty days"):
        eng.store(text, project="p")

    fused = eng.search("storage", limit=5, project="p", fusion="rrf")
    check("retrieval metadata present", "retrieval" in fused)
    check("mode reported", fused["retrieval"]["mode"] in ("rrf", "rrf-empty"))
    check("results returned", len(fused["results"]) >= 1)

    if fused["retrieval"]["mode"] == "rrf":
        top = fused["results"][0]
        check("rrf score attached", "rrf_score" in top)
        check("rrf rank attached", top.get("rrf_rank") == 1)
        check("per-arm ranks attached", isinstance(top.get("source_ranks"), dict))
        check("scores are monotonically non-increasing",
              all(fused["results"][i]["score"] >= fused["results"][i + 1]["score"]
                  for i in range(len(fused["results"]) - 1)))


def test_graph_expansion():
    print("graph expansion (associative recall)")

    eng = engine()
    # The orphan is stored first so the engine's recency backfill does not
    # reach it; it must therefore arrive purely through the link.
    orphan = eng.store("Quorum timeouts were raised to nine seconds", project="p")["memory_id"]
    for i in range(30):
        eng.store(f"Filler note number {i} about unrelated subsystem topics", project="p")
    hit = eng.store("The zephyr subsystem handles quorum election", project="p")["memory_id"]
    eng.link(hit, orphan, "related_to")

    without = eng.search("zephyr", limit=3, project="p", fusion="rrf")
    check("orphan absent without expansion", orphan not in [r["id"] for r in without["results"]])

    with_graph = eng.search("zephyr", limit=3, project="p", fusion="rrf", graph_expand=True)
    ids = [r["id"] for r in with_graph["results"]]
    check("expansion reports a count", with_graph["retrieval"].get("graph_expanded", 0) >= 1)
    check("orphan retrieved through the link", orphan in ids)

    # The row is attributed to the graph arm either because expansion added it
    # outright (`via`) or because it was already a weak candidate that the
    # graph arm lifted (`graph_score`). Which of the two happens depends on
    # whether the vector arm independently surfaced it, so asserting only
    # `via` would make this test depend on ChromaDB state it does not control.
    expanded = next((r for r in with_graph["results"] if r["id"] == orphan), None)
    check("expanded row is attributed to the graph arm",
          expanded is not None and (expanded.get("via") == "graph" or expanded.get("graph_score", 0) > 0),
          f"got via={expanded and expanded.get('via')} graph={expanded and expanded.get('graph_score')}")
    check("expanded row carries an activation", expanded and expanded.get("graph_score", 0) > 0)

    check("expansion is inert with no links",
          engine().search("anything", limit=3, fusion="rrf", graph_expand=True)
          ["retrieval"].get("graph_expanded", 0) == 0)


def test_temporal_retrieval():
    print("temporal retrieval")

    eng = engine()
    for text in ("Deployment rollback procedure for the API gateway",
                 "Gateway latency spike investigation notes",
                 "Unrelated billing reconciliation notes"):
        eng.store(text, project="p")

    dated = eng.search("gateway issues yesterday", limit=5, project="p", fusion="rrf", temporal=True)
    check("temporal window extracted", dated["retrieval"].get("temporal_window") is not None)
    check("keyword arm survives the temporal words",
          any(r.get("fts_score", 0) > 0 for r in dated["results"]))
    check("a gateway memory ranks first", "ateway" in dated["results"][0]["content"])

    plain = eng.search("gateway issues", limit=5, project="p", fusion="rrf", temporal=True)
    check("no temporal intent yields no window", plain["retrieval"].get("temporal_window") is None)


def test_advanced_retrieval_is_contained():
    print("failure containment")

    eng = engine()
    eng.store("A memory about container scheduling", project="p")

    check("unknown fusion mode does not raise",
          isinstance(eng.search("container", limit=3, project="p", fusion="nonsense"), dict))
    check("empty query does not raise",
          isinstance(eng.search("", limit=3, project="p", fusion="rrf",
                                graph_expand=True, temporal=True), dict))
    check("empty store does not raise",
          isinstance(engine().search("anything", limit=3, fusion="rrf",
                                     graph_expand=True, temporal=True), dict))
    check("all features together return results",
          len(eng.search("container scheduling", limit=3, project="p", fusion="rrf",
                         graph_expand=True, temporal=True)["results"]) >= 1)

    # Filters must still be honoured on the advanced path.
    eng.store("Scoped memory in another project", project="other")
    scoped = eng.search("memory", limit=10, project="other", fusion="rrf", graph_expand=True)
    check("project filter respected under advanced retrieval",
          all(r.get("project") in ("other", None) for r in scoped["results"]))


def main():
    for test in (
        test_baseline_unchanged,
        test_existing_operations_still_work,
        test_migration_from_pre_upgrade_db,
        test_proof_accumulation,
        test_contradiction_links,
        test_rank_fusion,
        test_graph_expansion,
        test_temporal_retrieval,
        test_advanced_retrieval_is_contained,
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
