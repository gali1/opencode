"""Unit tests for the Hindsight-derived memory primitives.

Pure-function tests: no database, no network, no embedding backend.

Run directly:      python3 packages/opencode/test/tool/mempalace_hindsight_test.py
Or under pytest:   pytest packages/opencode/test/tool/mempalace_hindsight_test.py
"""

import math
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src", "tool"))

from mempalace_hindsight import (  # noqa: E402
    BOOST_LEVELS,
    DEFAULT_RRF_K,
    boosted_rrf_score,
    combined_score,
    compute_recency_decay,
    detect_contradiction,
    expand_links,
    extract_temporal_constraint,
    is_degenerate,
    link_activation,
    proof_norm,
    reciprocal_rank_fusion,
    recency_for_range,
    select_with_temporal_coverage,
    spans_calendar_period,
    temporal_proximity,
    trigram_similarity,
)

_FAILURES = []


def check(name, condition, detail=""):
    if condition:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        _FAILURES.append(name)


def close(a, b, tol=1e-6):
    return abs(a - b) <= tol


# ── Reciprocal Rank Fusion ────────────────────────────────────────────────

def test_rrf():
    print("reciprocal_rank_fusion")

    fused = reciprocal_rank_fusion([("fts", ["a", "b"]), ("vec", ["b", "a"])])
    check("returns every unique id once", sorted(r["id"] for r in fused) == ["a", "b"])
    check("exact formula for rank 1 + rank 2",
          close(fused[0]["rrf_score"], 1 / 61 + 1 / 62))

    # b is rank1 in vec and rank2 in fts; a is rank1 in fts and rank2 in vec.
    # Identical totals -> stable order, first appearance ("a") wins.
    check("ties preserve first-appearance order", fused[0]["id"] == "a")

    fused = reciprocal_rank_fusion([("fts", ["x", "y"]), ("vec", ["y"])])
    check("multi-arm agreement outranks single-arm top hit", fused[0]["id"] == "y")
    check("rrf_rank is 1-based and dense",
          [r["rrf_rank"] for r in fused] == [1, 2])
    check("source_ranks record per-arm position",
          fused[0]["source_ranks"] == {"fts_rank": 2, "vec_rank": 1})

    check("empty input yields empty output", reciprocal_rank_fusion([]) == [])
    check("empty arms are tolerated", reciprocal_rank_fusion([("fts", [])]) == [])

    # A single arm with many results must stay in its original order.
    many = reciprocal_rank_fusion([("fts", [str(i) for i in range(50)])])
    check("single arm preserves order", [r["id"] for r in many] == [str(i) for i in range(50)])


def test_rrf_boosts():
    print("boosted_rrf_score")

    ranks = {"graph_rank": 10}
    base = 1.0 / (DEFAULT_RRF_K + 10)

    check("no boosts is identity", close(boosted_rrf_score(base, ranks, {}), base))
    check("unknown arm ignored", close(boosted_rrf_score(base, ranks, {"vec": "high"}), base))
    check("unknown level ignored", close(boosted_rrf_score(base, ranks, {"graph": "bogus"}), base))

    low = boosted_rrf_score(base, ranks, {"graph": "low"})
    medium = boosted_rrf_score(base, ranks, {"graph": "medium"})
    high = boosted_rrf_score(base, ranks, {"graph": "high"})
    check("boost levels are monotonic", base < low < medium < high)

    # The defining property of rank-space boosting: a boosted candidate at rank r
    # outranks an unboosted one at rank s iff r < divisor * s, independent of k.
    divisor = BOOST_LEVELS["medium"]
    boosted = boosted_rrf_score(1.0 / (DEFAULT_RRF_K + 30), {"graph_rank": 30}, {"graph": "medium"})
    rival = 1.0 / (DEFAULT_RRF_K + 10)  # 30 < 4*10, so boosted should win
    check("rank-space boost displaces by divisor factor", boosted > rival)
    rival_far = 1.0 / (DEFAULT_RRF_K + 6)  # 30 > 4*6, so boosted should lose
    check("boost reach is bounded", boosted < rival_far)
    check("divisor is the documented value", divisor == 4.0)


# ── Recency ───────────────────────────────────────────────────────────────

def test_recency():
    print("compute_recency_decay")

    check("age zero is maximally fresh", close(compute_recency_decay(0), 1.0))
    check("linear decay midpoint", close(compute_recency_decay(182.5, "linear", 365.0), 0.5))
    check("linear floor is 0.1", close(compute_recency_decay(10_000, "linear", 365.0), 0.1))
    check("none is always neutral", close(compute_recency_decay(9999, "none"), 0.5))
    check("exponential halflife is neutral at halflife",
          close(compute_recency_decay(90, "exponential", None, 90.0), 0.5))
    check("exponential clamps future dates", close(compute_recency_decay(-5, "exponential"), 1.0))
    check("signal stays within [0,1]",
          all(0.0 <= compute_recency_decay(d) <= 1.0 for d in (0, 1, 100, 400, 100000)))


def test_coarse_dates():
    print("recency_for_range")

    now = datetime(2026, 8, 1)
    check("full year is a calendar period",
          spans_calendar_period(datetime(2015, 1, 1), datetime(2015, 12, 31, 23, 59, 59)))
    check("full month is a calendar period",
          spans_calendar_period(datetime(2026, 3, 1), datetime(2026, 3, 31, 23, 59, 59)))
    check("a two-day span is not a calendar period",
          not spans_calendar_period(datetime(2026, 3, 1), datetime(2026, 3, 3)))
    check("inverted range is not a calendar period",
          not spans_calendar_period(datetime(2026, 3, 5), datetime(2026, 3, 1)))

    coarse = recency_for_range(datetime(2026, 1, 1), datetime(2026, 12, 31, 23, 59, 59), None, now)
    check("coarse date capped at neutral", coarse <= 0.5)

    precise = recency_for_range(datetime(2026, 7, 30), None, None, now)
    check("recent precise date scores above neutral", precise > 0.5)
    check("missing dates are neutral", close(recency_for_range(None, None, None, now), 0.5))
    check("falls back to mentioned_at",
          close(recency_for_range(None, None, datetime(2026, 7, 30), now), precise))


# ── Evidence ──────────────────────────────────────────────────────────────

def test_proof_norm():
    print("proof_norm")

    check("single observation is neutral", close(proof_norm(1), 0.5))
    check("two observations exceed neutral", proof_norm(2) > 0.5)
    check("exact log formula", close(proof_norm(3), 0.5 + math.log(3) / 10.0))
    check("monotonic in evidence", proof_norm(2) < proof_norm(5) < proof_norm(20))
    check("clamped at 1.0", proof_norm(10**9) <= 1.0)
    check("zero/negative degrade to neutral", close(proof_norm(0), 0.5) and close(proof_norm(-3), 0.5))
    check("None degrades to neutral", close(proof_norm(None), 0.5))
    check("garbage degrades to neutral", close(proof_norm("abc"), 0.5))


# ── Combined scoring ──────────────────────────────────────────────────────

def test_combined_score():
    print("combined_score")

    check("all-neutral signals are identity", close(combined_score(0.8), 0.8))
    check("high signals boost", combined_score(0.5, recency=1.0) > 0.5)
    check("low signals penalize", combined_score(0.5, recency=0.0) < 0.5)

    # Bounded: with all four alphas the total swing must stay modest, so a
    # secondary signal can reorder near-ties but not overturn real relevance.
    best = combined_score(1.0, recency=1.0, importance=1.0, proof=1.0, graph=1.0)
    worst = combined_score(1.0, recency=0.0, importance=0.0, proof=0.0, graph=0.0)
    check("max boost under +26%", best < 1.26, f"got {best:.4f}")
    check("max penalty under -22%", worst > 0.78, f"got {worst:.4f}")

    # The guarantee that keeps this a tie-breaker and not a re-ranker: the
    # full swing ratio must stay under ~1.6, so a 1.8x base lead survives the
    # worst-case pairing of an all-cold strong hit against an all-hot weak one.
    check("combined swing ratio stays under 1.6", best / worst < 1.6,
          f"ratio={best / worst:.4f}")
    strong = combined_score(0.90, recency=0.0, importance=0.0, proof=0.0, graph=0.0)
    weak = combined_score(0.50, recency=1.0, importance=1.0, proof=1.0, graph=1.0)
    check("secondary signals cannot overturn a large base gap", strong > weak,
          f"strong={strong:.4f} weak={weak:.4f}")
    check("scales proportionally with base",
          close(combined_score(0.4, recency=1.0) / 0.4, combined_score(0.8, recency=1.0) / 0.8))


# ── Graph expansion ───────────────────────────────────────────────────────

def test_link_activation():
    print("link_activation")

    check("zero links is zero", close(link_activation(0), 0.0))
    check("saturating tanh values", close(link_activation(1), math.tanh(0.5)))
    check("monotonic", link_activation(1) < link_activation(2) < link_activation(3))
    check("realistic counts stay below 1", link_activation(3) < 1.0)
    check("bounded by 1 even at extremes", link_activation(1000) <= 1.0)
    check("negative treated as zero", close(link_activation(-5), 0.0))


def test_expand_links():
    print("expand_links")

    adjacency = {
        "a": [("b", "related_to")],
        "b": [("c", "related_to")],
        "c": [("d", "related_to")],
    }
    out = expand_links(["a"], adjacency, max_hops=2)
    check("seeds are excluded from results", "a" not in out)
    check("one hop reached", "b" in out)
    check("two hops reached", "c" in out)
    check("hop limit respected", "d" not in out)
    check("activation decays per hop", out["b"] > out["c"])
    check("first hop uses the documented decay", close(out["b"], 0.7))

    strong = expand_links(["a"], {"a": [("b", "supersedes")]}, max_hops=1)
    weak = expand_links(["a"], {"a": [("b", "related_to")]}, max_hops=1)
    check("relation type modulates activation", strong["b"] > weak["b"])
    check("activation is clamped to 1.0", strong["b"] <= 1.0)

    check("empty seeds yield nothing", expand_links([], adjacency) == {})
    check("empty graph yields nothing", expand_links(["a"], {}) == {})

    # Cycles must terminate.
    cyclic = {"a": [("b", "related_to")], "b": [("a", "related_to")]}
    check("cycles terminate", isinstance(expand_links(["a"], cyclic, max_hops=5), dict))

    # Budget cap.
    wide = {"seed": [(f"n{i}", "related_to") for i in range(100)]}
    check("budget caps result size", len(expand_links(["seed"], wide, max_hops=1, budget=10)) <= 10)

    # Below-threshold propagation stops.
    check("threshold halts weak propagation",
          expand_links(["a"], adjacency, max_hops=5, threshold=0.9) == {})


# ── Temporal parsing ──────────────────────────────────────────────────────

def test_temporal_extraction():
    print("extract_temporal_constraint")

    now = datetime(2026, 6, 15, 12, 0, 0)

    check("no temporal intent returns None",
          extract_temporal_constraint("how does the parser work", now) is None)
    check("empty query returns None", extract_temporal_constraint("", now) is None)
    check("None query returns None", extract_temporal_constraint(None, now) is None)

    start, end = extract_temporal_constraint("what did I do yesterday", now)
    check("yesterday resolves to the previous day",
          start.date() == datetime(2026, 6, 14).date() and end.date() == datetime(2026, 6, 14).date())
    check("windows are day-aligned", start.hour == 0 and end.hour == 23)

    start, end = extract_temporal_constraint("changes from last week", now)
    check("last week is a 7-day window", (end.date() - start.date()).days == 6)
    check("last week precedes this week", end.date() < now.date())

    start, end = extract_temporal_constraint("the March 2026 migration", now)
    check("month+year resolves to that month",
          start.date() == datetime(2026, 3, 1).date() and end.date() == datetime(2026, 3, 31).date())

    start, end = extract_temporal_constraint("what shipped in 2024", now)
    check("bare year with introducer resolves to the year",
          start.date() == datetime(2024, 1, 1).date() and end.date() == datetime(2024, 12, 31).date())

    check("implausible year rejected",
          extract_temporal_constraint("error on port 9999", now) is None
          or extract_temporal_constraint("error on port 9999", now)[0].year != 9999)

    start, end = extract_temporal_constraint("last 3 days of work", now)
    check("last N units spans N days back", (now - start).days <= 4 and end >= now.replace(hour=0))

    result = extract_temporal_constraint("2 weeks ago", now)
    check("N units ago returns a padded window around the point", result is not None)
    start, end = result
    target = now - timedelta(days=14)
    check("N units ago brackets the target instant", start <= target <= end,
          f"start={start} target={target} end={end}")
    check("N units ago window is padded, not a single day", (end - start).days >= 2)

    start, end = extract_temporal_constraint("what happened today", now)
    check("today resolves to the current day", start.date() == now.date() == end.date())

    start, end = extract_temporal_constraint("recently discussed", now)
    check("recently is a trailing window", (end - start).days >= 13)

    start, end = extract_temporal_constraint("the last month rollout", now)
    check("last month is the previous calendar month",
          start.date() == datetime(2026, 5, 1).date() and end.date() == datetime(2026, 5, 31).date())

    start, end = extract_temporal_constraint("last year revenue", now)
    check("last year resolves to the prior year", start.year == 2025 and end.year == 2025)


def test_analyze_query():
    print("analyze_query")

    from mempalace_hindsight import analyze_query

    now = datetime(2026, 6, 15, 12, 0, 0)

    window, residual = analyze_query("gateway issues yesterday", now)
    check("window extracted", window is not None)
    check("temporal phrase stripped from residual", "yesterday" not in residual.lower())
    check("content terms preserved", "gateway" in residual and "issues" in residual)

    window, residual = analyze_query("how does the parser work", now)
    check("no temporal intent leaves query untouched",
          window is None and residual == "how does the parser work")

    window, residual = analyze_query("what happened yesterday", now)
    check("purely temporal query keeps a usable residual", residual.strip() != "")

    window, residual = analyze_query("the March 2026 migration", now)
    check("month-year stripped", "2026" not in residual)
    check("subject preserved", "migration" in residual)

    window, residual = analyze_query("deploys in the last 3 days", now)
    check("last N units stripped", "3 days" not in residual)
    check("subject preserved for last-N", "deploys" in residual)

    check("empty query is safe", analyze_query("", now) == (None, ""))
    check("None query is safe", analyze_query(None, now)[1] is None)


def test_temporal_proximity():
    print("temporal_proximity")

    start, end = datetime(2026, 6, 1), datetime(2026, 6, 11)
    check("midpoint scores 1.0", close(temporal_proximity(datetime(2026, 6, 6), start, end), 1.0))
    check("edges score 0.0", close(temporal_proximity(start, start, end), 0.0))
    check("outside the window clamps to 0.0",
          close(temporal_proximity(datetime(2027, 1, 1), start, end), 0.0))
    check("missing target is neutral", close(temporal_proximity(None, start, end), 0.5))
    check("zero-width window is 1.0", close(temporal_proximity(start, start, start), 1.0))
    mid_ish = temporal_proximity(datetime(2026, 6, 4), start, end)
    check("interior decays toward the edges", 0.0 < mid_ish < 1.0)


def test_temporal_coverage():
    print("select_with_temporal_coverage")

    start, end = datetime(2026, 6, 1), datetime(2026, 6, 30)
    # Nine rows clustered in two days plus one far away; a plain score sort
    # would return only the cluster.
    rows = [{"_date": datetime(2026, 6, 2), "score": 0.9 - i * 0.01, "id": f"c{i}"} for i in range(9)]
    rows.append({"_date": datetime(2026, 6, 28), "score": 0.5, "id": "late"})

    selected = select_with_temporal_coverage(rows, 3, start, end)
    check("returns the requested count", len(selected) == 3)
    check("spreads across the window", any(r["id"] == "late" for r in selected))

    check("no-op when already within limit",
          len(select_with_temporal_coverage(rows[:2], 5, start, end)) == 2)
    check("zero limit returns empty", select_with_temporal_coverage(rows, 0, start, end) == [])
    check("undated rows are tolerated",
          len(select_with_temporal_coverage(
              [{"score": 0.5, "id": str(i)} for i in range(5)], 2, start, end)) == 2)


# ── Text utilities ────────────────────────────────────────────────────────

def test_trigram():
    print("trigram_similarity")

    check("identical text is 1.0", close(trigram_similarity("hello world", "hello world"), 1.0))
    check("disjoint text is 0.0", close(trigram_similarity("aaa", "zzz"), 0.0))
    check("case insensitive", close(trigram_similarity("Hello", "hello"), 1.0))
    check("partial overlap is between", 0.0 < trigram_similarity("hello world", "hello there") < 1.0)
    check("empty inputs are 0.0", close(trigram_similarity("", ""), 0.0))
    check("symmetric", close(trigram_similarity("abc def", "def ghi"), trigram_similarity("def ghi", "abc def")))
    check("bounded", all(0.0 <= trigram_similarity(a, b) <= 1.0
                         for a, b in (("a", "b"), ("test", "testing"), ("x y z", "z y x"))))


def test_degenerate():
    print("is_degenerate")

    for bad in (None, "", "   ", "...", "-", "n/a", "N/A", "null", "***", ".,;"):
        check(f"rejects {bad!r}", is_degenerate(bad))
    for good in ("a real memory", "x = 1", "OK", "42"):
        check(f"accepts {good!r}", not is_degenerate(good))


# ── Contradiction detection ───────────────────────────────────────────────

def test_contradiction():
    print("detect_contradiction")

    hit, conf = detect_contradiction(
        "The project does not use webpack for bundling assets",
        "The project uses webpack for bundling assets",
    )
    check("negation flip detected", hit)
    check("confidence within band", 0.5 <= conf <= 0.95)

    hit, _ = detect_contradiction(
        "Caching is disabled for the session store",
        "Caching is enabled for the session store",
    )
    check("antonym flip detected", hit)

    hit, _ = detect_contradiction(
        "The project uses webpack for bundling",
        "The project uses webpack for bundling",
    )
    check("identical text is a duplicate, not a contradiction", not hit)

    hit, _ = detect_contradiction("Completely unrelated topic here", "The sky is blue today")
    check("unrelated text is not a contradiction", not hit)

    hit, _ = detect_contradiction("", "something")
    check("empty input is safe", not hit)
    hit, _ = detect_contradiction(None, None)
    check("None input is safe", not hit)

    hit, _ = detect_contradiction(
        "The build is fast and reliable now",
        "The build is fast and reliable now indeed",
    )
    check("near-identical text excluded by the upper gate", not hit)

    # Both detectors agreeing should not exceed the cap.
    _, conf = detect_contradiction(
        "Feature flags are not enabled in production",
        "Feature flags are disabled in production",
    )
    check("confidence never exceeds 0.95", conf <= 0.95)


def main():
    for test in (
        test_rrf, test_rrf_boosts, test_recency, test_coarse_dates, test_proof_norm,
        test_combined_score, test_link_activation, test_expand_links,
        test_temporal_extraction, test_analyze_query, test_temporal_proximity, test_temporal_coverage,
        test_trigram, test_degenerate, test_contradiction,
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
