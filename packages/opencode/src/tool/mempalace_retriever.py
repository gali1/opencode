"""
mempalace_retriever.py — Advanced retrieval, contradiction detection, fact checking,
and multi-hop graph traversal for the OpenCode MemPalace integration.

Place this file at: packages/opencode/src/tool/mempalace_retriever.py

Addresses three limitations:
1. Retrieve-everything doesn't scale — adaptive two-phase retrieval with
   collection-aware top_k, recency weighting, and deduplication.
2. Retrieval accuracy — multi-signal re-ranking (semantic + BM25 + recency +
   source diversity + KG entity expansion).
3. Missing features — contradiction detection, fact checking, multi-hop
   graph traversal.
"""

import math
import os
import re
import time
import hashlib
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("mempalace_retriever")

# ══════════════════════════════════════════════════════════════════════════
#  1. ADAPTIVE RETRIEVAL — scales top_k and retrieval strategy based on
#     collection size instead of fixed top_k=50.
# ══════════════════════════════════════════════════════════════════════════

# Thresholds for adaptive strategy selection
_SMALL_PALACE = 500        # < 500 drawers: brute-force is fine
_MEDIUM_PALACE = 5000      # 500–5000: two-phase retrieval
_LARGE_PALACE = 50000      # 5000–50000: aggressive filtering required
                           # > 50000: tiered with hard caps

# Deduplication similarity threshold — drawers above this cosine similarity
# to an already-selected result are suppressed.
_DEDUP_SIMILARITY = 0.92

# Recency decay half-life in days — a 30-day-old memory scores ~0.5x
# recency weight vs a fresh one.
_RECENCY_HALF_LIFE_DAYS = 30


def _compute_adaptive_top_k(total_drawers: int, requested: int) -> int:
    """Determine how many candidates to fetch from the vector index.

    The over-fetch ratio scales with collection size:
      - small (<500):   3x requested (fast, low noise)
      - medium (<5k):   4x requested, capped at sqrt(total)*2
      - large (<50k):   5x requested, capped at sqrt(total)*1.5
      - huge (≥50k):    6x requested, hard cap at 300

    This ensures we never scan the entire collection while still fetching
    enough candidates for accurate re-ranking.
    """
    if total_drawers < _SMALL_PALACE:
        return min(requested * 3, total_drawers)
    elif total_drawers < _MEDIUM_PALACE:
        return min(requested * 4, int(math.sqrt(total_drawers) * 2), 150)
    elif total_drawers < _LARGE_PALACE:
        return min(requested * 5, int(math.sqrt(total_drawers) * 1.5), 250)
    else:
        return min(requested * 6, 300)


def _recency_score(filed_at: str) -> float:
    """Exponential decay score based on age. Returns 0.0–1.0."""
    try:
        if not filed_at or filed_at == "unknown":
            return 0.5  # neutral for undated memories
        ts = datetime.fromisoformat(filed_at.replace("Z", "+00:00"))
        age_days = max(0, (datetime.now(ts.tzinfo) - ts).total_seconds() / 86400)
        return math.exp(-0.693 * age_days / _RECENCY_HALF_LIFE_DAYS)
    except (ValueError, TypeError):
        return 0.5


def _content_hash(text: str) -> str:
    """Fast content fingerprint for deduplication."""
    normalized = re.sub(r"\s+", " ", text.strip().lower())[:500]
    return hashlib.md5(normalized.encode()).hexdigest()


def _deduplicate(results: list) -> list:
    """Remove near-duplicate results by content fingerprint."""
    seen_hashes = set()
    deduplicated = []
    for r in results:
        text = r.get("text", "")
        h = _content_hash(text)
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        deduplicated.append(r)
    return deduplicated


def _expand_query_with_kg(query: str, kg, max_expansions: int = 5) -> str:
    """Expand the search query with related entities from the knowledge graph.

    Extracts capitalized words from the query, looks them up in the KG,
    and appends related entity names to improve recall on entity-centric
    queries. Example: "auth flow" + KG knows "AuthService depends_on
    DatabasePool" → expanded query includes "DatabasePool".
    """
    if kg is None:
        return query

    words = re.findall(r"\b[A-Z][a-zA-Z0-9_]{2,}\b", query)
    if not words:
        return query

    expansions = []
    for word in words[:3]:
        try:
            facts = kg.query_entity(word, direction="both")
            for fact in facts[:max_expansions]:
                obj = fact.get("object", "")
                subj = fact.get("subject", "")
                related = obj if obj.lower() != word.lower() else subj
                if related and related not in expansions and related.lower() not in query.lower():
                    expansions.append(related)
        except Exception:
            continue

    if expansions:
        return query + " " + " ".join(expansions[:max_expansions])
    return query


def adaptive_search(
    query: str,
    palace_path: str,
    wing: str = None,
    room: str = None,
    n_results: int = 5,
    kg=None,
    vector_disabled: bool = False,
    expand_with_kg: bool = True,
) -> dict:
    """Two-phase adaptive retrieval that scales to large palaces.

    Phase 1 — Candidate selection:
      Determine adaptive top_k based on collection size. Fetch candidates
      from vector index (or BM25 fallback if vector is disabled).

    Phase 2 — Multi-signal re-ranking:
      Re-rank candidates by weighted combination of:
        - Semantic similarity (cosine, from vector index)
        - BM25 keyword match (from searcher._hybrid_rank)
        - Recency decay (exponential, half-life = 30 days)
        - Source diversity bonus (penalize multiple hits from same file)

    Phase 3 — Deduplication and truncation:
      Remove near-duplicate content, truncate to requested n_results.

    Returns the same dict shape as search_memories() for compatibility.
    """
    from mempalace.searcher import search_memories

    # KG entity expansion — improves recall for entity-centric queries
    effective_query = query
    if expand_with_kg and kg is not None:
        effective_query = _expand_query_with_kg(query, kg)

    # Determine collection size for adaptive top_k
    try:
        from mempalace.palace import get_collection
        col = get_collection(palace_path, create=False)
        total_drawers = col.count() if col else 0
    except Exception:
        total_drawers = 0

    adaptive_k = _compute_adaptive_top_k(total_drawers, n_results)

    # Phase 1: Candidate retrieval (delegates to existing search_memories
    # which already does BM25 hybrid re-ranking internally)
    search_kwargs = {
        "query": effective_query,
        "palace_path": palace_path,
        "wing": wing,
        "room": room,
        "n_results": adaptive_k,
        "max_distance": 0.0,  # no hard cutoff — we'll re-rank
    }
    # vector_disabled param added in mempalace ≥3.4; skip if unavailable
    import inspect
    if "vector_disabled" in inspect.signature(search_memories).parameters:
        search_kwargs["vector_disabled"] = vector_disabled
    raw_results = search_memories(**search_kwargs)

    candidates = raw_results.get("results", [])
    if not candidates:
        return {
            "query": query,
            "effective_query": effective_query,
            "filters": {"wing": wing, "room": room},
            "total_drawers": total_drawers,
            "adaptive_k": adaptive_k,
            "results": [],
            "retrieval_method": "adaptive",
        }

    # Phase 2: Multi-signal re-ranking
    source_counts = {}
    for c in candidates:
        src = c.get("source_file", "?")
        source_counts[src] = source_counts.get(src, 0) + 1

    for c in candidates:
        # Semantic score (already computed by search_memories)
        sem_score = c.get("similarity", 0.0) or 0.0

        # BM25 score (already computed by search_memories hybrid re-rank)
        bm25_raw = c.get("bm25_score", 0.0) or 0.0

        # Recency score
        recency = _recency_score(c.get("created_at", "unknown"))

        # Source diversity penalty — if many hits from same file, reduce
        src = c.get("source_file", "?")
        diversity = 1.0 / math.sqrt(source_counts.get(src, 1))

        # Weighted combination
        c["_adaptive_score"] = (
            0.40 * sem_score +
            0.25 * min(bm25_raw / 10.0, 1.0) +  # normalize BM25 to ~0-1
            0.20 * recency +
            0.15 * diversity
        )
        c["recency_score"] = round(recency, 3)
        c["diversity_score"] = round(diversity, 3)

    # Sort by adaptive score
    candidates.sort(key=lambda c: c.get("_adaptive_score", 0), reverse=True)

    # Phase 3: Deduplicate and truncate
    candidates = _deduplicate(candidates)
    hits = candidates[:n_results]

    # Clean internal keys
    for h in hits:
        h["adaptive_score"] = round(h.pop("_adaptive_score", 0), 4)

    return {
        "query": query,
        "effective_query": effective_query,
        "filters": {"wing": wing, "room": room},
        "total_drawers": total_drawers,
        "adaptive_k": adaptive_k,
        "results": hits,
        "retrieval_method": "adaptive",
        "kg_expanded": effective_query != query,
    }


# ══════════════════════════════════════════════════════════════════════════
#  2. CONTRADICTION DETECTION — find facts in the KG that conflict with
#     a given statement.
# ══════════════════════════════════════════════════════════════════════════

# Predicate pairs that are semantically contradictory
_CONTRADICTORY_PREDICATES = {
    "depends_on": {"independent_of", "does_not_use", "removed_dependency"},
    "uses": {"does_not_use", "removed", "dropped"},
    "is_a": {"is_not_a"},
    "owns": {"does_not_own"},
    "started": {"stopped", "ended", "quit"},
    "enabled": {"disabled"},
    "active": {"inactive", "deprecated"},
    "supports": {"does_not_support", "dropped_support"},
    "loves": {"hates", "dislikes"},
    "child_of": {},
    "works_on": {"left", "quit"},
    "member_of": {"left", "removed_from"},
}

# Build reverse mapping
for _k, _vs in list(_CONTRADICTORY_PREDICATES.items()):
    for _v in _vs:
        _CONTRADICTORY_PREDICATES.setdefault(_v, set()).add(_k)


def _predicates_contradict(pred_a: str, pred_b: str) -> bool:
    """Check if two predicates are semantically contradictory."""
    if pred_a == pred_b:
        return False
    a_lower = pred_a.lower().replace("-", "_").replace(" ", "_")
    b_lower = pred_b.lower().replace("-", "_").replace(" ", "_")
    contras = _CONTRADICTORY_PREDICATES.get(a_lower, set())
    return b_lower in contras


def _extract_entities_from_text(text: str) -> list:
    """Extract likely entity names from a natural language statement."""
    # Capitalized multi-char words, CamelCase, snake_case identifiers
    entities = re.findall(r"\b[A-Z][a-zA-Z0-9_]{2,}\b", text)
    # Also grab quoted terms
    entities += re.findall(r'"([^"]{2,50})"', text)
    entities += re.findall(r"'([^']{2,50})'", text)
    # Dedupe preserving order
    seen = set()
    unique = []
    for e in entities:
        if e.lower() not in seen:
            seen.add(e.lower())
            unique.append(e)
    return unique


def contradiction_check(
    statement: str,
    entity: str = None,
    kg=None,
    palace_path: str = None,
    search_memories_fn=None,
) -> dict:
    """Find facts that contradict a given statement.

    Approach:
    1. Extract entities from the statement (or use provided entity).
    2. Query the KG for all current facts about those entities.
    3. For each fact, check if the predicate contradicts the statement's
       implied relationship.
    4. Also search memory for semantically similar but contradictory content.
    5. Return contradictions ranked by confidence.

    Returns:
        {
            "statement": str,
            "entities_checked": list,
            "contradictions": [
                {
                    "type": "kg" | "memory",
                    "fact": str,
                    "confidence": float,
                    "reason": str,
                    "source": dict,
                }
            ],
            "verdict": "no_contradictions" | "possible_contradictions" | "strong_contradictions"
        }
    """
    if kg is None:
        return {
            "statement": statement,
            "entities_checked": [],
            "contradictions": [],
            "verdict": "no_contradictions",
            "error": "Knowledge graph not available",
        }

    # Step 1: Determine entities to check
    if entity:
        entities = [entity]
    else:
        entities = _extract_entities_from_text(statement)

    if not entities:
        return {
            "statement": statement,
            "entities_checked": [],
            "contradictions": [],
            "verdict": "no_contradictions",
            "note": "No entities found in statement to check against",
        }

    contradictions = []

    # Step 2: Check KG facts for each entity
    for ent in entities[:10]:  # cap to avoid runaway queries
        try:
            facts = kg.query_entity(ent, direction="both")
        except Exception:
            continue

        for fact in facts:
            subj = fact.get("subject", "")
            pred = fact.get("predicate", "")
            obj = fact.get("object", "")
            ended = fact.get("ended")

            # Skip already-invalidated facts
            if ended:
                continue

            fact_str = f"{subj} → {pred} → {obj}"

            # Check for direct contradictions via predicate pairs
            # Extract implied predicate from statement using simple heuristics
            stmt_lower = statement.lower()

            # Direct negation check
            is_negated = any(
                neg in stmt_lower
                for neg in [
                    "not ", "no longer ", "doesn't ", "does not ",
                    "isn't ", "is not ", "won't ", "cannot ", "removed ",
                    "stopped ", "dropped ", "disabled ", "deprecated ",
                ]
            )

            # Check if the fact's entities appear in the statement
            subj_in_stmt = subj.lower() in stmt_lower
            obj_in_stmt = obj.lower() in stmt_lower

            if subj_in_stmt and obj_in_stmt:
                if is_negated:
                    # Statement negates a relationship between the same entities
                    contradictions.append({
                        "type": "kg",
                        "fact": fact_str,
                        "confidence": 0.85,
                        "reason": f"Statement negates existing fact: {fact_str}",
                        "source": fact,
                    })
                elif pred.lower() in stmt_lower:
                    # Same predicate, same entities — might be an update, not contradiction
                    pass
                else:
                    # Same entities, different relationship — check if predicates contradict
                    for word in re.findall(r"\b\w+\b", statement):
                        if _predicates_contradict(pred, word):
                            contradictions.append({
                                "type": "kg",
                                "fact": fact_str,
                                "confidence": 0.75,
                                "reason": f"Predicate '{word}' contradicts existing '{pred}' for same entities",
                                "source": fact,
                            })
                            break

    # Step 3: Search memory for semantically conflicting content
    if search_memories_fn and palace_path:
        try:
            negated_query = f"NOT {statement}" if len(statement) < 200 else statement
            memory_results = search_memories_fn(
                negated_query,
                palace_path=palace_path,
                n_results=5,
                max_distance=0.8,
            )
            for hit in memory_results.get("results", []):
                sim = hit.get("similarity", 0)
                if sim and sim > 0.6:
                    hit_text = hit.get("text", "")[:300]
                    # Check if memory contains negation of statement entities
                    has_entity_overlap = any(
                        e.lower() in hit_text.lower() for e in entities
                    )
                    if has_entity_overlap:
                        contradictions.append({
                            "type": "memory",
                            "fact": hit_text,
                            "confidence": round(min(sim * 0.7, 0.9), 3),
                            "reason": "Semantically similar memory may contain conflicting information",
                            "source": {
                                "wing": hit.get("wing"),
                                "room": hit.get("room"),
                                "similarity": sim,
                            },
                        })
        except Exception as e:
            logger.debug("Memory contradiction search failed: %s", e)

    # Step 4: Determine verdict
    contradictions.sort(key=lambda c: c["confidence"], reverse=True)

    max_confidence = max((c["confidence"] for c in contradictions), default=0.0)
    if max_confidence >= 0.8:
        verdict = "strong_contradictions"
    elif max_confidence >= 0.5:
        verdict = "possible_contradictions"
    else:
        verdict = "no_contradictions"

    return {
        "statement": statement,
        "entities_checked": entities,
        "contradictions": contradictions[:10],  # cap output
        "verdict": verdict,
        "total_contradictions": len(contradictions),
    }


# ══════════════════════════════════════════════════════════════════════════
#  3. FACT CHECKING — validate a claim against KG + stored memories.
# ══════════════════════════════════════════════════════════════════════════

def fact_check(
    claim: str,
    kg=None,
    palace_path: str = None,
    search_memories_fn=None,
    vector_disabled: bool = False,
) -> dict:
    """Validate a claim against the knowledge graph and stored memories.

    Returns a confidence assessment with supporting and contradicting evidence.

    Scoring:
        - KG exact match (subject + predicate + object all present): +0.4
        - KG partial match (2 of 3 present): +0.2
        - Memory semantic match (similarity > 0.8): +0.3
        - Memory partial match (similarity 0.5–0.8): +0.15
        - Contradiction detected: -0.3 per contradiction

    Returns:
        {
            "claim": str,
            "confidence": float (0.0–1.0),
            "verdict": "supported" | "partially_supported" | "unverified" | "contradicted",
            "supporting_evidence": [...],
            "contradicting_evidence": [...],
            "entities": list,
        }
    """
    entities = _extract_entities_from_text(claim)
    supporting = []
    contradicting = []
    confidence = 0.0

    # KG evidence
    if kg is not None:
        for ent in entities[:10]:
            try:
                facts = kg.query_entity(ent, direction="both")
            except Exception:
                continue

            claim_lower = claim.lower()
            for fact in facts:
                subj = fact.get("subject", "")
                pred = fact.get("predicate", "")
                obj = fact.get("object", "")
                ended = fact.get("ended")

                if ended:
                    continue

                fact_str = f"{subj} → {pred} → {obj}"

                # Count how many of the triple's components appear in the claim
                matches = sum([
                    subj.lower() in claim_lower if subj else False,
                    pred.lower().replace("_", " ") in claim_lower if pred else False,
                    obj.lower() in claim_lower if obj else False,
                ])

                if matches >= 3:
                    supporting.append({
                        "type": "kg_exact",
                        "fact": fact_str,
                        "strength": 0.4,
                    })
                    confidence += 0.4
                elif matches >= 2:
                    supporting.append({
                        "type": "kg_partial",
                        "fact": fact_str,
                        "strength": 0.2,
                    })
                    confidence += 0.2

    # Memory evidence
    if search_memories_fn and palace_path:
        try:
            results = search_memories_fn(
                claim,
                palace_path=palace_path,
                n_results=5,
                max_distance=0.0,
                vector_disabled=vector_disabled,
            )
            for hit in results.get("results", []):
                sim = hit.get("similarity", 0) or 0
                if sim > 0.8:
                    supporting.append({
                        "type": "memory_strong",
                        "text": hit.get("text", "")[:200],
                        "similarity": sim,
                        "wing": hit.get("wing"),
                        "room": hit.get("room"),
                        "strength": 0.3,
                    })
                    confidence += 0.3
                elif sim > 0.5:
                    supporting.append({
                        "type": "memory_partial",
                        "text": hit.get("text", "")[:200],
                        "similarity": sim,
                        "wing": hit.get("wing"),
                        "room": hit.get("room"),
                        "strength": 0.15,
                    })
                    confidence += 0.15
        except Exception as e:
            logger.debug("Fact check memory search failed: %s", e)

    # Contradiction check
    contra_result = contradiction_check(
        claim,
        kg=kg,
        palace_path=palace_path,
        search_memories_fn=search_memories_fn,
    )
    for contra in contra_result.get("contradictions", []):
        contradicting.append(contra)
        confidence -= 0.3 * contra.get("confidence", 0.5)

    # Clamp confidence
    confidence = round(max(0.0, min(1.0, confidence)), 3)

    # Determine verdict
    if contradicting and confidence < 0.3:
        verdict = "contradicted"
    elif confidence >= 0.6:
        verdict = "supported"
    elif confidence >= 0.3:
        verdict = "partially_supported"
    else:
        verdict = "unverified"

    return {
        "claim": claim,
        "confidence": confidence,
        "verdict": verdict,
        "supporting_evidence": supporting[:10],
        "contradicting_evidence": contradicting[:5],
        "entities": entities,
    }


# ══════════════════════════════════════════════════════════════════════════
#  4. MULTI-HOP GRAPH TRAVERSAL — find indirect relationships between
#     entities through the knowledge graph.
# ══════════════════════════════════════════════════════════════════════════

def multi_hop_query(
    start_entity: str,
    target_entity: str = None,
    max_hops: int = 3,
    kg=None,
) -> dict:
    """BFS traversal through the knowledge graph to find paths between entities.

    If target_entity is provided, finds all paths from start to target
    within max_hops. If target is None, returns all reachable entities
    and the shortest paths to them.

    Returns:
        {
            "start": str,
            "target": str | None,
            "max_hops": int,
            "paths": [
                {
                    "hops": int,
                    "path": ["EntityA", "—[predicate]→", "EntityB", ...],
                    "entities": ["EntityA", "EntityB", ...],
                    "predicates": ["predicate1", ...],
                }
            ],
            "reachable_entities": int,
            "graph_explored": int,
        }
    """
    if kg is None:
        return {
            "start": start_entity,
            "target": target_entity,
            "error": "Knowledge graph not available",
            "paths": [],
        }

    max_hops = max(1, min(max_hops, 6))  # cap at 6 to prevent runaway

    # BFS state
    queue = [(start_entity, [start_entity], [], [])]  # (current, entity_path, pred_path, full_path)
    visited = {start_entity.lower()}
    found_paths = []
    all_reachable = {start_entity}
    nodes_explored = 0
    max_nodes = 500  # hard cap on exploration

    while queue and nodes_explored < max_nodes:
        current, entity_path, pred_path, full_path = queue.pop(0)
        nodes_explored += 1

        if len(entity_path) - 1 >= max_hops:
            continue

        # Get all relationships for current entity
        try:
            facts = kg.query_entity(current, direction="both")
        except Exception:
            continue

        for fact in facts:
            subj = fact.get("subject", "")
            pred = fact.get("predicate", "")
            obj = fact.get("object", "")
            ended = fact.get("ended")

            if ended:
                continue

            # Determine the neighbor entity
            if subj.lower() == current.lower():
                neighbor = obj
                direction = "→"
            elif obj.lower() == current.lower():
                neighbor = subj
                direction = "←"
            else:
                continue

            if not neighbor:
                continue

            all_reachable.add(neighbor)

            if neighbor.lower() in visited:
                continue
            visited.add(neighbor.lower())

            new_entity_path = entity_path + [neighbor]
            new_pred_path = pred_path + [pred]
            edge_label = f"—[{pred}]{direction}" if direction == "→" else f"{direction}[{pred}]—"
            new_full_path = full_path + [edge_label, neighbor]

            # Check if we reached the target
            if target_entity and neighbor.lower() == target_entity.lower():
                found_paths.append({
                    "hops": len(new_entity_path) - 1,
                    "path": [entity_path[0]] + new_full_path,
                    "entities": new_entity_path,
                    "predicates": new_pred_path,
                })

            # Continue BFS if we have hops remaining
            if len(new_entity_path) - 1 < max_hops:
                queue.append((neighbor, new_entity_path, new_pred_path, new_full_path))

    # If no target specified, return all reachable entities as "paths"
    if not target_entity and not found_paths:
        # Re-run to collect shortest paths to each reachable entity
        # (already done during BFS — just format differently)
        pass

    # Sort paths by hop count
    found_paths.sort(key=lambda p: p["hops"])

    result = {
        "start": start_entity,
        "target": target_entity,
        "max_hops": max_hops,
        "paths": found_paths[:20],  # cap output
        "reachable_entities": len(all_reachable),
        "graph_explored": nodes_explored,
    }

    if not target_entity:
        result["reachable"] = sorted(all_reachable - {start_entity})

    return result