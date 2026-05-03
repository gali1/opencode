"""
mempalace_rekal_engine.py — Rekal memory intelligence natively embedded into MemPalace.

Place at: packages/opencode/src/tool/mempalace_rekal_engine.py

Provides:
  - Structured memory entries with types, tags, projects, access tracking
  - Memory lifecycle: store, update, supersede (with link preservation), delete
  - Memory links: supersedes, contradicts, related_to
  - Hybrid search: FTS5 BM25 + ChromaDB vector + recency decay (configurable weights)
  - Conflict detection and resolution
  - Session context building (build_context)
  - Multi-hop graph traversal
  - Memory health and introspection

Architecture:
  - SQLite database (rekal_memories.db) for structured metadata, FTS5, links, config
  - MemPalace's ChromaDB for vector embeddings (reused, not duplicated)
  - MemPalace's KnowledgeGraph for entity relationships (reused)
  - All synchronous (matches bridge stdin loop)

Zero new pip dependencies. Uses only stdlib sqlite3 + existing MemPalace.
"""

import hashlib
import json
import logging
import math
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("mempalace_rekal")

# ══════════════════════════════════════════════════════════════════════════
#  Schema
# ══════════════════════════════════════════════════════════════════════════

SCHEMA = """\
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL DEFAULT 'fact'
        CHECK (memory_type IN ('fact','preference','procedure','context','episode')),
    project TEXT,
    wing TEXT,
    room TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_links (
    from_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    to_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    relation TEXT NOT NULL CHECK (relation IN ('supersedes','contradicts','related_to')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (from_id, to_id, relation)
);

CREATE TABLE IF NOT EXISTS rekal_config (
    project TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (project, key)
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    content, tags, project,
    content='memories',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, content, tags, project)
    VALUES (new.rowid, new.content, new.tags, new.project);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content, tags, project)
    VALUES ('delete', old.rowid, old.content, old.tags, old.project);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content, tags, project)
    VALUES ('delete', old.rowid, old.content, old.tags, old.project);
    INSERT INTO memories_fts(rowid, content, tags, project)
    VALUES (new.rowid, new.content, new.tags, new.project);
END;
"""


# ══════════════════════════════════════════════════════════════════════════
#  Scoring
# ══════════════════════════════════════════════════════════════════════════

DEFAULT_W_FTS = 0.4
DEFAULT_W_VEC = 0.4
DEFAULT_W_RECENCY = 0.2
DEFAULT_HALF_LIFE = 30.0


def _normalize_fts(score):
    """FTS5 BM25: negative scores, lower = better. Sigmoid to [0,1]."""
    if score >= 0:
        return 0.0
    return 1.0 / (1.0 + math.exp(score))


def _normalize_vec(distance):
    """Cosine distance [0,2] → similarity [0,1]."""
    return max(0.0, 1.0 - distance)


def _recency_score(days, half_life=30.0):
    """Exponential decay. 0 days = 1.0, half_life days = 0.5."""
    return math.exp(-0.693 * max(0.0, days) / max(0.1, half_life))


def _days_since(timestamp_str):
    """Parse ISO timestamp, return days since now. 0 on error."""
    try:
        if not timestamp_str:
            return 0
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt
        return max(0.0, delta.total_seconds() / 86400)
    except (ValueError, TypeError):
        return 0


def _quote_fts(query):
    """Wrap each token in FTS5 phrase quotes for safe matching."""
    tokens = query.replace('"', " ").replace("\x00", "").split()
    return " ".join(f'"{t}"' for t in tokens if t)


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _new_id():
    return uuid.uuid4().hex[:16]


# ══════════════════════════════════════════════════════════════════════════
#  Engine
# ══════════════════════════════════════════════════════════════════════════

class RekalEngine:
    """Synchronous Rekal memory engine backed by SQLite + MemPalace ChromaDB.

    Initialized once per bridge subprocess lifetime. The SQLite database
    lives alongside MemPalace's ChromaDB in the same data directory.
    """

    def __init__(self, data_dir, palace_path=None, kg=None, search_memories_fn=None):
        self.data_dir = data_dir
        self.palace_path = palace_path or data_dir
        self.kg = kg
        self.search_memories_fn = search_memories_fn

        os.makedirs(data_dir, exist_ok=True)
        db_path = os.path.join(data_dir, "rekal_memories.db")
        self.db = sqlite3.connect(db_path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(SCHEMA)
        self.db.commit()

    def close(self):
        try:
            self.db.close()
        except Exception:
            pass

    # ── Config ────────────────────────────────────────────────────────

    def _resolve_weights(self, project=None, w_fts=None, w_vec=None,
                         w_recency=None, half_life=None):
        """Four-level weight resolution: per-call > DB config > defaults."""
        result = {
            "w_fts": DEFAULT_W_FTS,
            "w_vec": DEFAULT_W_VEC,
            "w_recency": DEFAULT_W_RECENCY,
            "half_life": DEFAULT_HALF_LIFE,
        }
        # Layer 2: DB project config
        if project:
            cursor = self.db.execute(
                "SELECT key, value FROM rekal_config WHERE project = ?",
                (project,),
            )
            for row in cursor:
                if row["key"] in result:
                    try:
                        result[row["key"]] = float(row["value"])
                    except (ValueError, TypeError):
                        pass
        # Layer 1: per-call overrides
        overrides = {"w_fts": w_fts, "w_vec": w_vec, "w_recency": w_recency,
                     "half_life": half_life}
        for k, v in overrides.items():
            if v is not None:
                result[k] = float(v)
        return result

    def set_config(self, project, key, value):
        valid_keys = {"w_fts", "w_vec", "w_recency", "half_life"}
        if key not in valid_keys:
            return {"error": f"Invalid key '{key}'. Valid: {', '.join(sorted(valid_keys))}"}
        try:
            float(value)
        except (ValueError, TypeError):
            return {"error": f"Value must be numeric, got: {value}"}
        self.db.execute(
            "INSERT INTO rekal_config (project, key, value) VALUES (?, ?, ?) "
            "ON CONFLICT (project, key) DO UPDATE SET value = excluded.value",
            (project, key, str(value)),
        )
        self.db.commit()
        return {"success": True, "key": key, "value": value, "project": project}

    # ── Store ─────────────────────────────────────────────────────────

    def store(self, content, memory_type="fact", project=None, wing=None,
              room=None, tags=None):
        memory_id = _new_id()
        ts = _now()
        tags_json = json.dumps(tags) if tags else None
        self.db.execute(
            """INSERT INTO memories
               (id, content, memory_type, project, wing, room, tags, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (memory_id, content, memory_type, project, wing or "project",
             room or "general", tags_json, ts, ts),
        )
        self.db.commit()

        # Also store in MemPalace ChromaDB for vector search
        try:
            from mempalace.mcp_server import tool_add_drawer
            tool_add_drawer(
                wing=wing or "project",
                room=room or "general",
                content=content,
                added_by="rekal",
            )
        except Exception as e:
            logger.debug("ChromaDB store failed (non-fatal): %s", e)

        return {
            "success": True,
            "memory_id": memory_id,
            "memory_type": memory_type,
            "project": project,
            "wing": wing or "project",
            "room": room or "general",
        }

    # ── Update ────────────────────────────────────────────────────────

    def update(self, memory_id, content=None, tags=None, memory_type=None):
        if content is None and tags is None and memory_type is None:
            return {"success": True, "memory_id": memory_id, "noop": True}

        tags_json = json.dumps(tags) if tags is not None else None
        ts = _now()
        cursor = self.db.execute(
            """UPDATE memories SET
               content = COALESCE(?, content),
               tags = COALESCE(?, tags),
               memory_type = COALESCE(?, memory_type),
               updated_at = ?
               WHERE id = ?""",
            (content, tags_json, memory_type, ts, memory_id),
        )
        self.db.commit()
        if cursor.rowcount == 0:
            return {"success": False, "error": f"Memory {memory_id} not found"}
        return {"success": True, "memory_id": memory_id}

    # ── Supersede ─────────────────────────────────────────────────────

    def supersede(self, old_id, new_content, memory_type=None, project=None,
                  wing=None, room=None, tags=None):
        old = self.db.execute("SELECT * FROM memories WHERE id = ?", (old_id,)).fetchone()
        if not old:
            return {"success": False, "error": f"Memory {old_id} not found"}

        new_id = _new_id()
        ts = _now()
        eff_tags = json.dumps(tags) if tags is not None else old["tags"]
        self.db.execute(
            """INSERT INTO memories
               (id, content, memory_type, project, wing, room, tags, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (new_id, new_content,
             memory_type or old["memory_type"],
             project or old["project"],
             wing or old["wing"],
             room or old["room"],
             eff_tags, ts, ts),
        )
        self.db.execute(
            "INSERT INTO memory_links (from_id, to_id, relation, created_at) VALUES (?, ?, 'supersedes', ?)",
            (new_id, old_id, ts),
        )
        self.db.commit()

        # Store new version in ChromaDB too
        try:
            from mempalace.mcp_server import tool_add_drawer
            tool_add_drawer(
                wing=wing or old["wing"] or "project",
                room=room or old["room"] or "general",
                content=new_content,
                added_by="rekal",
            )
        except Exception:
            pass

        return {
            "success": True,
            "new_id": new_id,
            "old_id": old_id,
            "fact": f"Created {new_id} superseding {old_id}",
        }

    # ── Delete ────────────────────────────────────────────────────────

    def delete(self, memory_id):
        cursor = self.db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        self.db.commit()
        if cursor.rowcount == 0:
            return {"success": False, "error": f"Memory {memory_id} not found"}
        return {"success": True, "memory_id": memory_id}

    # ── Link ──────────────────────────────────────────────────────────

    def link(self, from_id, to_id, relation):
        if relation not in ("supersedes", "contradicts", "related_to"):
            return {"error": f"Invalid relation: {relation}"}
        try:
            self.db.execute(
                "INSERT OR IGNORE INTO memory_links (from_id, to_id, relation, created_at) VALUES (?, ?, ?, ?)",
                (from_id, to_id, relation, _now()),
            )
            self.db.commit()
            return {"success": True, "from": from_id, "to": to_id, "relation": relation}
        except sqlite3.IntegrityError as e:
            return {"error": str(e)}

    # ── Search (hybrid) ───────────────────────────────────────────────

    def search(self, query, limit=10, project=None, memory_type=None,
               wing=None, room=None, w_fts=None, w_vec=None,
               w_recency=None, half_life=None):
        weights = self._resolve_weights(project, w_fts, w_vec, w_recency, half_life)

        # Phase 1: FTS5 candidates from Rekal SQLite
        fts_scores = {}
        fts_query = _quote_fts(query)
        if fts_query:
            try:
                cursor = self.db.execute(
                    """SELECT m.id, memories_fts.rank AS fts_rank
                       FROM memories_fts
                       JOIN memories m ON m.rowid = memories_fts.rowid
                       WHERE memories_fts MATCH ?
                       AND m.id NOT IN (SELECT to_id FROM memory_links WHERE relation = 'supersedes')
                       ORDER BY memories_fts.rank LIMIT ?""",
                    (fts_query, limit * 3),
                )
                for row in cursor:
                    fts_scores[row["id"]] = row["fts_rank"]
            except sqlite3.OperationalError:
                pass

        # Phase 2: ChromaDB vector candidates (includes MemPalace native drawers)
        chroma_hits = []
        vec_scores = {}
        if self.search_memories_fn:
            try:
                import inspect
                kwargs = {
                    "query": query,
                    "palace_path": self.palace_path,
                    "wing": wing,
                    "room": room,
                    "n_results": limit * 3,
                    "max_distance": 0.0,
                }
                if "vector_disabled" in inspect.signature(self.search_memories_fn).parameters:
                    kwargs["vector_disabled"] = False
                chroma_results = self.search_memories_fn(**kwargs)
                for hit in chroma_results.get("results", []):
                    text = hit.get("text", "")
                    dist = hit.get("distance")
                    if text:
                        content_key = hashlib.md5(text[:200].encode()).hexdigest()[:12]
                        if dist is not None:
                            vec_scores[content_key] = float(dist)
                        chroma_hits.append(hit)
            except Exception as e:
                logger.debug("ChromaDB vector search failed: %s", e)

        # Phase 3: Score Rekal SQLite entries
        candidate_ids = set(fts_scores.keys())
        if len(candidate_ids) < limit * 2:
            cursor = self.db.execute(
                """SELECT id FROM memories
                   WHERE id NOT IN (SELECT to_id FROM memory_links WHERE relation = 'supersedes')
                   ORDER BY created_at DESC LIMIT ?""",
                (limit * 3,),
            )
            for row in cursor:
                candidate_ids.add(row["id"])

        scored = []
        seen_content_keys = set()

        for cid in candidate_ids:
            mem = self.db.execute("SELECT * FROM memories WHERE id = ?", (cid,)).fetchone()
            if not mem:
                continue
            if project and mem["project"] != project:
                continue
            if memory_type and mem["memory_type"] != memory_type:
                continue
            if wing and mem["wing"] != wing:
                continue
            if room and mem["room"] != room:
                continue

            fts_norm = _normalize_fts(fts_scores.get(cid, 0.0))
            content_key = hashlib.md5((mem["content"] or "")[:200].encode()).hexdigest()[:12]
            seen_content_keys.add(content_key)
            vec_dist = vec_scores.get(content_key, 1.0)
            vec_norm = _normalize_vec(vec_dist)
            days = _days_since(mem["created_at"])
            rec_norm = _recency_score(days, weights["half_life"])
            score = (
                weights["w_fts"] * fts_norm +
                weights["w_vec"] * vec_norm +
                weights["w_recency"] * rec_norm
            )
            tags = []
            try:
                tags = json.loads(mem["tags"]) if mem["tags"] else []
            except (json.JSONDecodeError, TypeError):
                pass
            scored.append({
                "id": mem["id"],
                "content": mem["content"],
                "memory_type": mem["memory_type"],
                "project": mem["project"],
                "wing": mem["wing"],
                "room": mem["room"],
                "tags": tags,
                "created_at": mem["created_at"],
                "updated_at": mem["updated_at"],
                "access_count": mem["access_count"],
                "score": round(score, 4),
                "fts_score": round(fts_norm, 3),
                "vec_score": round(vec_norm, 3),
                "recency_score": round(rec_norm, 3),
                "source": "rekal",
            })

        # Phase 4: Include ChromaDB-only results (MemPalace native drawers
        # stored via 'store' operation that have no Rekal SQLite entry)
        for hit in chroma_hits:
            text = hit.get("text", "")
            content_key = hashlib.md5(text[:200].encode()).hexdigest()[:12]
            if content_key in seen_content_keys:
                continue
            seen_content_keys.add(content_key)

            hit_wing = hit.get("wing", "unknown")
            hit_room = hit.get("room", "unknown")
            if wing and hit_wing != wing:
                continue
            if room and hit_room != room:
                continue

            vec_dist = hit.get("distance", 1.0)
            vec_norm = _normalize_vec(float(vec_dist) if vec_dist is not None else 1.0)
            bm25 = hit.get("bm25_score", 0.0) or 0.0
            filed_at = hit.get("created_at", "unknown")
            days = _days_since(filed_at) if filed_at != "unknown" else 0
            rec_norm = _recency_score(days, weights["half_life"])
            fts_norm = min(bm25 / 10.0, 1.0) if bm25 > 0 else 0.0

            score = (
                weights["w_fts"] * fts_norm +
                weights["w_vec"] * vec_norm +
                weights["w_recency"] * rec_norm
            )
            scored.append({
                "id": hit.get("source_file", content_key),
                "content": text[:2000],
                "memory_type": "fact",
                "project": None,
                "wing": hit_wing,
                "room": hit_room,
                "tags": [],
                "created_at": filed_at,
                "updated_at": filed_at,
                "access_count": 0,
                "score": round(score, 4),
                "fts_score": round(fts_norm, 3),
                "vec_score": round(vec_norm, 3),
                "recency_score": round(rec_norm, 3),
                "source": "mempalace_drawer",
            })

        # Update access counts for Rekal entries only
        ts = _now()
        for s in scored:
            if s.get("source") == "rekal":
                self.db.execute(
                    "UPDATE memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?",
                    (ts, s["id"]),
                )
        self.db.commit()

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {
            "query": query,
            "weights": weights,
            "results": scored[:limit],
            "total_candidates": len(scored),
        }

    # ── Build Context ─────────────────────────────────────────────────

    def build_context(self, query, project=None, limit=10, w_fts=None,
                      w_vec=None, w_recency=None, half_life=None):
        memories = self.search(
            query, limit=limit, project=project,
            w_fts=w_fts, w_vec=w_vec, w_recency=w_recency, half_life=half_life,
        )
        conflicts = self.get_conflicts(project=project)

        results = memories.get("results", [])
        if results:
            oldest = min(r["created_at"] for r in results)
            newest = max(r["created_at"] for r in results)
            timeline = f"{len(results)} memories from {oldest} to {newest}"
        else:
            timeline = "No memories found"

        return {
            "query": query,
            "memories": results,
            "conflicts": conflicts,
            "timeline_summary": timeline,
            "weights": memories.get("weights", {}),
        }

    # ── Conflicts ─────────────────────────────────────────────────────

    def get_conflicts(self, project=None):
        query = """
            SELECT ml.from_id, m1.content AS from_content,
                   ml.to_id, m2.content AS to_content,
                   ml.relation, ml.created_at
            FROM memory_links ml
            JOIN memories m1 ON m1.id = ml.from_id
            JOIN memories m2 ON m2.id = ml.to_id
            WHERE ml.relation = 'contradicts'
        """
        params = []
        if project:
            query += " AND (m1.project = ? OR m2.project = ?)"
            params.extend([project, project])

        results = []
        for row in self.db.execute(query, params):
            results.append({
                "memory_id": row["from_id"],
                "content": row["from_content"],
                "related_id": row["to_id"],
                "related_content": row["to_content"],
                "relation": row["relation"],
                "created_at": row["created_at"],
            })
        return results

    # ── Health ────────────────────────────────────────────────────────

    def health(self):
        def _count(sql):
            row = self.db.execute(sql).fetchone()
            return int(row[0]) if row else 0

        def _first(sql):
            row = self.db.execute(sql).fetchone()
            return str(row[0]) if row and row[0] else None

        total = _count("SELECT COUNT(*) FROM memories")
        total_links = _count("SELECT COUNT(*) FROM memory_links")
        total_conflicts = _count("SELECT COUNT(*) FROM memory_links WHERE relation = 'contradicts'")
        total_superseded = _count("SELECT COUNT(*) FROM memory_links WHERE relation = 'supersedes'")
        oldest = _first("SELECT MIN(created_at) FROM memories")
        newest = _first("SELECT MAX(created_at) FROM memories")

        by_type = {}
        for row in self.db.execute(
            "SELECT memory_type, COUNT(*) as cnt FROM memories GROUP BY memory_type"
        ):
            by_type[row["memory_type"]] = row["cnt"]

        by_project = {}
        for row in self.db.execute(
            "SELECT COALESCE(project, '<none>') as p, COUNT(*) as cnt FROM memories GROUP BY project"
        ):
            by_project[row["p"]] = row["cnt"]

        return {
            "total_memories": total,
            "total_links": total_links,
            "total_conflicts": total_conflicts,
            "total_superseded": total_superseded,
            "active_memories": total - total_superseded,
            "oldest_memory": oldest,
            "newest_memory": newest,
            "memories_by_type": by_type,
            "memories_by_project": by_project,
        }

    # ── Similar ───────────────────────────────────────────────────────

    def similar(self, memory_id, limit=5):
        mem = self.db.execute("SELECT content FROM memories WHERE id = ?", (memory_id,)).fetchone()
        if not mem:
            return {"error": f"Memory {memory_id} not found", "results": []}
        return self.search(mem["content"], limit=limit + 1)

    # ── Topics ────────────────────────────────────────────────────────

    def topics(self, project=None):
        query = """
            SELECT memory_type AS topic, COUNT(*) AS count, MAX(created_at) AS latest
            FROM memories
            WHERE (? IS NULL OR project = ?)
            GROUP BY memory_type ORDER BY count DESC
        """
        results = []
        for row in self.db.execute(query, (project, project)):
            results.append({
                "topic": row["topic"],
                "count": row["count"],
                "latest": row["latest"],
            })
        return results

    # ── Timeline ──────────────────────────────────────────────────────

    def timeline(self, project=None, start=None, end=None, limit=20):
        query = """
            SELECT * FROM memories
            WHERE (? IS NULL OR project = ?)
              AND (? IS NULL OR created_at >= ?)
              AND (? IS NULL OR created_at <= ?)
            ORDER BY created_at DESC LIMIT ?
        """
        results = []
        for row in self.db.execute(query, (project, project, start, start, end, end, limit)):
            tags = []
            try:
                tags = json.loads(row["tags"]) if row["tags"] else []
            except (json.JSONDecodeError, TypeError):
                pass
            results.append({
                "id": row["id"],
                "content": row["content"],
                "memory_type": row["memory_type"],
                "project": row["project"],
                "wing": row["wing"],
                "room": row["room"],
                "tags": tags,
                "created_at": row["created_at"],
            })
        return results

    # ── Related ───────────────────────────────────────────────────────

    def related(self, memory_id):
        results = []
        for row in self.db.execute(
            """SELECT ml.relation, ml.to_id AS id, m.content
               FROM memory_links ml JOIN memories m ON m.id = ml.to_id
               WHERE ml.from_id = ?""",
            (memory_id,),
        ):
            results.append(dict(row))
        for row in self.db.execute(
            """SELECT ml.relation, ml.from_id AS id, m.content
               FROM memory_links ml JOIN memories m ON m.id = ml.from_id
               WHERE ml.to_id = ?""",
            (memory_id,),
        ):
            results.append(dict(row))
        return results

    # ── Multi-hop Graph Traversal ─────────────────────────────────────

    def multi_hop(self, start_entity, target_entity=None, max_hops=3):
        if not self.kg:
            return {"error": "Knowledge graph not available", "paths": []}

        max_hops = max(1, min(max_hops, 6))
        queue = [(start_entity, [start_entity], [], [])]
        visited = {start_entity.lower()}
        found_paths = []
        all_reachable = {start_entity}
        explored = 0

        while queue and explored < 500:
            current, epath, ppath, fpath = queue.pop(0)
            explored += 1
            if len(epath) - 1 >= max_hops:
                continue

            try:
                facts = self.kg.query_entity(current, direction="both")
            except Exception:
                continue

            for fact in facts:
                subj = fact.get("subject", "")
                pred = fact.get("predicate", "")
                obj = fact.get("object", "")
                if fact.get("ended"):
                    continue

                if subj.lower() == current.lower():
                    neighbor, direction = obj, "→"
                elif obj.lower() == current.lower():
                    neighbor, direction = subj, "←"
                else:
                    continue

                if not neighbor:
                    continue
                all_reachable.add(neighbor)
                if neighbor.lower() in visited:
                    continue
                visited.add(neighbor.lower())

                new_ep = epath + [neighbor]
                new_pp = ppath + [pred]
                label = f"—[{pred}]{direction}" if direction == "→" else f"{direction}[{pred}]—"
                new_fp = fpath + [label, neighbor]

                if target_entity and neighbor.lower() == target_entity.lower():
                    found_paths.append({
                        "hops": len(new_ep) - 1,
                        "path": [epath[0]] + new_fp,
                        "entities": new_ep,
                        "predicates": new_pp,
                    })

                if len(new_ep) - 1 < max_hops:
                    queue.append((neighbor, new_ep, new_pp, new_fp))

        found_paths.sort(key=lambda p: p["hops"])
        result = {
            "start": start_entity,
            "target": target_entity,
            "max_hops": max_hops,
            "paths": found_paths[:20],
            "reachable_entities": len(all_reachable),
            "graph_explored": explored,
        }
        if not target_entity:
            result["reachable"] = sorted(all_reachable - {start_entity})
        return result

    # ── Contradiction Check ───────────────────────────────────────────

    def contradiction_check(self, statement, entity=None):
        entities = [entity] if entity else re.findall(r"\b[A-Z][a-zA-Z0-9_]{2,}\b", statement)
        if not entities:
            return {
                "statement": statement,
                "entities_checked": [],
                "contradictions": [],
                "verdict": "no_contradictions",
            }

        contradictions = []
        if self.kg:
            stmt_lower = statement.lower()
            is_negated = any(
                neg in stmt_lower
                for neg in ["not ", "no longer ", "doesn't ", "does not ",
                            "isn't ", "is not ", "removed ", "stopped ",
                            "dropped ", "disabled ", "deprecated "]
            )
            for ent in entities[:10]:
                try:
                    facts = self.kg.query_entity(ent, direction="both")
                except Exception:
                    continue
                for fact in facts:
                    if fact.get("ended"):
                        continue
                    subj = fact.get("subject", "")
                    obj = fact.get("object", "")
                    pred = fact.get("predicate", "")
                    subj_in = subj.lower() in stmt_lower
                    obj_in = obj.lower() in stmt_lower
                    if subj_in and obj_in and is_negated:
                        contradictions.append({
                            "type": "kg",
                            "fact": f"{subj} → {pred} → {obj}",
                            "confidence": 0.85,
                            "reason": f"Statement negates existing: {subj} → {pred} → {obj}",
                        })

        max_conf = max((c["confidence"] for c in contradictions), default=0.0)
        verdict = (
            "strong_contradictions" if max_conf >= 0.8
            else "possible_contradictions" if max_conf >= 0.5
            else "no_contradictions"
        )
        return {
            "statement": statement,
            "entities_checked": entities[:10],
            "contradictions": contradictions[:10],
            "verdict": verdict,
        }

    # ── Fact Check ────────────────────────────────────────────────────

    def fact_check(self, claim):
        entities = re.findall(r"\b[A-Z][a-zA-Z0-9_]{2,}\b", claim)
        supporting = []
        confidence = 0.0

        if self.kg:
            claim_lower = claim.lower()
            for ent in entities[:10]:
                try:
                    facts = self.kg.query_entity(ent, direction="both")
                except Exception:
                    continue
                for fact in facts:
                    if fact.get("ended"):
                        continue
                    subj = fact.get("subject", "")
                    pred = fact.get("predicate", "")
                    obj = fact.get("object", "")
                    matches = sum([
                        subj.lower() in claim_lower,
                        pred.lower().replace("_", " ") in claim_lower,
                        obj.lower() in claim_lower,
                    ])
                    if matches >= 3:
                        supporting.append({"type": "kg_exact", "fact": f"{subj} → {pred} → {obj}", "strength": 0.4})
                        confidence += 0.4
                    elif matches >= 2:
                        supporting.append({"type": "kg_partial", "fact": f"{subj} → {pred} → {obj}", "strength": 0.2})
                        confidence += 0.2

        # Memory search evidence
        search_result = self.search(claim, limit=5)
        for hit in search_result.get("results", []):
            sim = hit.get("vec_score", 0)
            if sim > 0.7:
                supporting.append({
                    "type": "memory_strong",
                    "text": hit["content"][:200],
                    "similarity": sim,
                    "strength": 0.3,
                })
                confidence += 0.3
            elif sim > 0.4:
                supporting.append({
                    "type": "memory_partial",
                    "text": hit["content"][:200],
                    "similarity": sim,
                    "strength": 0.15,
                })
                confidence += 0.15

        # Check contradictions
        contra = self.contradiction_check(claim)
        contradicting = contra.get("contradictions", [])
        for c in contradicting:
            confidence -= 0.3 * c.get("confidence", 0.5)

        confidence = round(max(0.0, min(1.0, confidence)), 3)
        verdict = (
            "contradicted" if contradicting and confidence < 0.3
            else "supported" if confidence >= 0.6
            else "partially_supported" if confidence >= 0.3
            else "unverified"
        )
        return {
            "claim": claim,
            "confidence": confidence,
            "verdict": verdict,
            "supporting_evidence": supporting[:10],
            "contradicting_evidence": contradicting[:5],
            "entities": entities[:10],
        }