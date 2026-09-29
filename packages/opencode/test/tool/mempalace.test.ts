import { describe, expect, test } from "bun:test"
import { Result, Schema } from "effect"
import { Parameters } from "../../src/tool/mempalace"

// The mempalace tool forwards its decoded parameters verbatim to a Python
// bridge over stdio. Effect's Schema.Struct strips any property it does not
// declare, so a key missing from this schema silently never reaches the
// bridge and the corresponding operation fails at runtime with an empty
// argument. These tests pin the wire contract so that class of bug cannot
// reappear unnoticed.

const parse = (input: unknown) => Schema.decodeUnknownSync(Parameters)(input)
const attempt = (input: unknown) => Schema.decodeUnknownResult(Parameters)(input)

describe("mempalace parameters", () => {
  test("operation is required", () => {
    expect(Result.isFailure(attempt({}))).toBe(true)
  })

  test("unknown operations are rejected", () => {
    expect(Result.isFailure(attempt({ operation: "definitely_not_an_operation" }))).toBe(true)
  })

  test("operation alone is sufficient", () => {
    expect(parse({ operation: "status" })).toEqual({ operation: "status" })
  })

  test("every declared operation decodes", () => {
    const operations = [
      "search", "smart_search", "store", "status", "list_wings", "list_rooms",
      "kg_add", "kg_query", "kg_invalidate", "contradiction_check", "fact_check",
      "multi_hop", "diary_write", "diary_read", "build_context", "ingest_turns",
      "memory_conflicts", "memory_delete", "memory_health", "memory_link",
      "memory_recall", "memory_related", "memory_search", "memory_similar",
      "memory_store", "memory_supersede", "memory_timeline", "memory_topics",
      "memory_update", "session_init", "set_config",
    ]
    for (const operation of operations) {
      expect(() => parse({ operation })).not.toThrow()
    }
  })

  // Regression: these identity parameters were absent from the schema, so
  // Schema.Struct stripped them and the bridge received an empty id. Every
  // id-taking operation failed with "Memory  not found".
  test("identity parameters survive decoding", () => {
    const decoded = parse({
      operation: "memory_update",
      memory_id: "abc123",
      old_id: "def456",
      from_id: "ghi789",
      to_id: "jkl012",
    })
    expect(decoded).toMatchObject({
      memory_id: "abc123",
      old_id: "def456",
      from_id: "ghi789",
      to_id: "jkl012",
    })
  })

  // Regression: memory_store could never set a type or project, so every
  // memory was stored as an unscoped "fact".
  test("classification parameters survive decoding", () => {
    const decoded = parse({
      operation: "memory_store",
      content: "a memory",
      memory_type: "preference",
      project: "my-project",
      importance: 0.8,
      tags: ["a", "b"],
    })
    expect(decoded).toMatchObject({
      memory_type: "preference",
      project: "my-project",
      importance: 0.8,
    })
    expect(decoded.tags).toEqual(["a", "b"])
  })

  test("memory_type is constrained to the storage enum", () => {
    for (const memory_type of ["fact", "preference", "procedure", "context", "episode"]) {
      expect(() => parse({ operation: "memory_store", memory_type })).not.toThrow()
    }
    expect(Result.isFailure(attempt({ operation: "memory_store", memory_type: "nonsense" }))).toBe(true)
  })

  test("link_relation is constrained to the link enum", () => {
    for (const link_relation of ["supersedes", "contradicts", "related_to"]) {
      expect(() => parse({ operation: "memory_link", link_relation })).not.toThrow()
    }
    expect(Result.isFailure(attempt({ operation: "memory_link", link_relation: "causes" }))).toBe(true)
  })

  // Regression: set_config was unreachable because project/key/value were
  // stripped, so per-project scoring weights could never be written.
  test("configuration parameters survive decoding", () => {
    const decoded = parse({
      operation: "set_config",
      project: "p",
      key: "w_fts",
      value: 0.4,
      w_fts: 0.4,
      w_vec: 0.3,
      w_recency: 0.2,
      w_access: 0.1,
      half_life: 45,
    })
    expect(decoded).toMatchObject({
      project: "p", key: "w_fts", value: 0.4,
      w_fts: 0.4, w_vec: 0.3, w_recency: 0.2, w_access: 0.1, half_life: 45,
    })
  })

  test("advanced retrieval parameters survive decoding", () => {
    const decoded = parse({
      operation: "memory_recall",
      query: "gateway issues yesterday",
      fusion: "rrf",
      graph_expand: true,
      temporal: true,
    })
    expect(decoded).toMatchObject({ fusion: "rrf", graph_expand: true, temporal: true })
  })

  test("fusion is constrained to supported modes", () => {
    expect(Result.isFailure(attempt({ operation: "memory_search", fusion: "magic" }))).toBe(true)
  })

  test("temporal knowledge-graph bounds survive decoding", () => {
    const decoded = parse({
      operation: "kg_query",
      entity: "AuthService",
      as_of: "2026-01-01",
      direction: "out",
      valid_from: "2025-01-01",
      ended: "2026-06-01",
    })
    expect(decoded).toMatchObject({
      as_of: "2026-01-01", direction: "out", valid_from: "2025-01-01", ended: "2026-06-01",
    })
  })

  test("direction is constrained", () => {
    expect(Result.isFailure(attempt({ operation: "kg_query", direction: "sideways" }))).toBe(true)
  })

  test("ingestion parameters survive decoding", () => {
    const decoded = parse({
      operation: "ingest_turns",
      turns: ["first turn", "second turn"],
      topic: "refactor",
      task: "port the memory layer",
    })
    expect(decoded.turns).toEqual(["first turn", "second turn"])
    expect(decoded).toMatchObject({ topic: "refactor", task: "port the memory layer" })
  })

  test("timeline bounds survive decoding", () => {
    expect(parse({ operation: "memory_timeline", start: "2026-01-01", end: "2026-02-01" })).toMatchObject({
      start: "2026-01-01",
      end: "2026-02-01",
    })
  })

  // Pre-existing parameters must keep working exactly as before.
  test("original parameters are unchanged", () => {
    const decoded = parse({
      operation: "search",
      query: "q", content: "c", wing: "w", room: "r", drawer: "d",
      tags: ["t"], limit: 5, entity: "e", relation: "rel", target: "tgt",
      confidence: 0.9, entry: "en", depth: 2, agent_name: "a",
      statement: "s", claim: "cl", expand_with_kg: true,
    })
    expect(decoded).toMatchObject({
      operation: "search", query: "q", content: "c", wing: "w", room: "r",
      drawer: "d", limit: 5, entity: "e", relation: "rel", target: "tgt",
      confidence: 0.9, entry: "en", depth: 2, agent_name: "a",
      statement: "s", claim: "cl", expand_with_kg: true,
    })
  })

  test("undeclared properties are still stripped", () => {
    const decoded = parse({ operation: "status", not_a_real_parameter: "x" }) as Record<string, unknown>
    expect(decoded.not_a_real_parameter).toBeUndefined()
  })
})
