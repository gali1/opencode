import { Effect, Schema } from "effect"
import { createHash } from "crypto"
import * as os from "os"
import * as path from "path"
import { spawn, type ChildProcess } from "child_process"
import * as Tool from "./tool"
import { InstanceState } from "@/effect/instance-state"
import DESCRIPTION from "./mempalace.txt"

const MODULE_DIR: string = (import.meta as any).dir ?? path.dirname(new URL(import.meta.url).pathname)
const BRIDGE_SCRIPT = path.join(MODULE_DIR, "mempalace_bridge.py")

// ─── Parameter schema ────────────────────────────────────────────────────
export const Parameters = Schema.Struct({
  operation: Schema.Literals([
    // MemPalace native
    "search",
    "store",
    "status",
    "list_wings",
    "list_rooms",
    "kg_add",
    "kg_query",
    "kg_invalidate",
    "diary_write",
    "diary_read",
    // Rekal engine
    "memory_store",
    "memory_search",
    "memory_update",
    "memory_supersede",
    "memory_delete",
    "memory_link",
    "build_context",
    "memory_conflicts",
    "memory_health",
    "memory_similar",
    "memory_topics",
    "memory_timeline",
    "memory_related",
    "contradiction_check",
    "fact_check",
    "multi_hop",
    "set_config",
  ]).annotate({
    description: "The operation to perform. This field is REQUIRED for every mempalace call.",
  }),
  query: Schema.optional(Schema.String).annotate({
    description: "Search query for memory_search, memory_similar, build_context, fact_check",
  }),
  content: Schema.optional(Schema.String).annotate({ description: "Content to store for memory_store, store" }),
  wing: Schema.optional(Schema.String).annotate({ description: "Wing name for storage operations" }),
  room: Schema.optional(Schema.String).annotate({ description: "Room name for storage operations" }),
  drawer: Schema.optional(Schema.String).annotate({ description: "Drawer identifier for MemPalace native operations" }),
  tags: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Tags to attach to a memory (2-4 specific tags)",
  }),
  limit: Schema.optional(Schema.Number).annotate({ description: "Maximum number of results to return" }),
  entity: Schema.optional(Schema.String).annotate({
    description: "Entity name for kg_query, contradiction_check, multi_hop",
  }),
  relation: Schema.optional(Schema.String).annotate({ description: "Relation type for memory_link, kg_add" }),
  target: Schema.optional(Schema.String).annotate({ description: "Target entity for multi_hop" }),
  confidence: Schema.optional(Schema.Number).annotate({
    description: "Confidence level for fact_check, contradiction_check",
  }),
  entry: Schema.optional(Schema.String).annotate({ description: "Diary entry content for diary_write" }),
  depth: Schema.optional(Schema.Number).annotate({ description: "Search depth for multi_hop" }),
  agent_name: Schema.optional(Schema.String).annotate({ description: "Agent identifier for diary_write, diary_read" }),
  // Rekal-specific
  memory_type: Schema.optional(Schema.String).annotate({
    description: "Type for memory_store: fact, preference, procedure, context, episode",
  }),
  project: Schema.optional(Schema.String).annotate({
    description: "Project scope for memory operations and set_config",
  }),
  memory_id: Schema.optional(Schema.String).annotate({ description: "Memory ID for memory_update, memory_delete" }),
  old_id: Schema.optional(Schema.String).annotate({
    description: "Existing memory ID to supersede for memory_supersede",
  }),
  from_id: Schema.optional(Schema.String).annotate({ description: "Source memory ID for memory_link" }),
  to_id: Schema.optional(Schema.String).annotate({ description: "Target memory ID for memory_link" }),
  link_relation: Schema.optional(Schema.String).annotate({
    description: "Link relation for memory_link: supersedes, contradicts, related_to",
  }),
  statement: Schema.optional(Schema.String).annotate({ description: "Statement to check for contradiction_check" }),
  claim: Schema.optional(Schema.String).annotate({ description: "Claim to validate for fact_check" }),
  w_fts: Schema.optional(Schema.Number).annotate({
    description: "BM25 keyword weight for memory_search (default 0.4)",
  }),
  w_vec: Schema.optional(Schema.Number).annotate({
    description: "Vector semantic weight for memory_search (default 0.4)",
  }),
  w_recency: Schema.optional(Schema.Number).annotate({ description: "Recency weight for memory_search (default 0.2)" }),
  half_life: Schema.optional(Schema.Number).annotate({
    description: "Recency half-life in days for memory_search (default 30)",
  }),
  start: Schema.optional(Schema.String).annotate({ description: "Start date for memory_timeline" }),
  end: Schema.optional(Schema.String).annotate({ description: "End date for memory_timeline" }),
  key: Schema.optional(Schema.String).annotate({ description: "Config key name for set_config" }),
  value: Schema.optional(Schema.String).annotate({ description: "Config value for set_config" }),
})

// ─── Subprocess manager ──────────────────────────────────────────────────
let _proc: ChildProcess | null = null
let _buffer = ""
let _pending: Array<{ resolve: (line: string) => void; reject: (err: Error) => void }> = []
let _initPromise: Promise<void> | null = null
let _currentDataDir = ""

function _spawnBridge(dataDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    _currentDataDir = dataDir
    try {
      _proc = spawn("python3", [BRIDGE_SCRIPT], {
        env: { ...process.env, MEMPALACE_DATA_DIR: dataDir },
        stdio: ["pipe", "pipe", "pipe"],
      })
    } catch (err) {
      reject(new Error(`Failed to spawn mempalace bridge: ${err}`))
      return
    }
    _buffer = ""
    _pending = []

    _proc.stdout!.on("data", (chunk: Buffer) => {
      _buffer += chunk.toString()
      const lines = _buffer.split("\n")
      _buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && _pending.length > 0) {
          const { resolve } = _pending.shift()!
          resolve(trimmed)
        }
      }
    })
    _proc.stderr!.on("data", (chunk: Buffer) => {
      process.stderr.write(`[mempalace] ${chunk.toString()}`)
    })
    _proc.on("error", (err) => {
      for (const p of _pending.splice(0)) p.reject(new Error(`mempalace error: ${err.message}`))
      _proc = null
      _initPromise = null
    })
    _proc.on("exit", (code) => {
      for (const p of _pending.splice(0)) p.reject(new Error(`mempalace exited: ${code}`))
      _proc = null
      _initPromise = null
    })
    const cleanup = () => {
      if (_proc?.exitCode === null) _proc.kill("SIGTERM")
    }
    process.on("exit", cleanup)
    process.on("SIGTERM", cleanup)
    process.on("SIGINT", cleanup)

    const timeout = setTimeout(() => {
      reject(new Error("mempalace bridge startup timeout (15s)"))
      _proc?.kill("SIGTERM")
      _proc = null
      _initPromise = null
    }, 15000)
    _pending.push({
      resolve: (line) => {
        clearTimeout(timeout)
        try {
          const msg = JSON.parse(line)
          if (msg.status === "ok") resolve()
          else {
            reject(new Error(msg.message || "startup failed"))
            _proc?.kill("SIGTERM")
            _proc = null
            _initPromise = null
          }
        } catch {
          reject(new Error("bridge parse error"))
          _proc?.kill("SIGTERM")
          _proc = null
          _initPromise = null
        }
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      },
    })
  })
}

function ensureBridge(dataDir: string): Promise<void> {
  if (_proc?.exitCode === null && _currentDataDir === dataDir) return Promise.resolve()
  if (_proc?.exitCode === null && _currentDataDir !== dataDir) {
    _proc.kill("SIGTERM")
    _proc = null
    _initPromise = null
  }
  if (!_initPromise) _initPromise = _spawnBridge(dataDir)
  return _initPromise
}

function ipcCall(request: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!_proc || _proc.exitCode !== null) {
      reject(new Error("mempalace not running"))
      return
    }
    _pending.push({
      resolve: (line) => {
        try {
          const r = JSON.parse(line)
          if (r.status === "error") reject(new Error(r.message ?? "unknown error"))
          else resolve(r.data)
        } catch {
          reject(new Error("IPC parse error"))
        }
      },
      reject,
    })
    _proc.stdin!.write(JSON.stringify(request) + "\n")
  })
}

// ─── Formatters ──────────────────────────────────────────────────────────

function fmtMemoryList(results: unknown[], label = "results"): string {
  if (!results.length) return "No memories found."
  return results
    .map((r: any, i: number) => {
      const score = typeof r.score === "number" ? r.score.toFixed(3) : ""
      const type = r.memory_type ?? ""
      const proj = r.project ?? ""
      const id = r.id ?? ""
      let header = `[${i + 1}]`
      if (score) header += ` score=${score}`
      if (type) header += ` type=${type}`
      if (proj) header += ` project=${proj}`
      if (id) header += ` id=${id}`
      if (r.wing) header += ` ${r.wing}/${r.room ?? "?"}`
      if (r.created_at) header += ` ${r.created_at}`
      const content = (r.content ?? r.text ?? "").substring(0, 2000)
      return `${header}\n    ${content}`
    })
    .join("\n\n")
}

function fmtConflicts(conflicts: any[]): string {
  if (!conflicts.length) return "No conflicts found."
  return conflicts
    .map(
      (c: any, i: number) =>
        `[${i + 1}] ${c.memory_id} vs ${c.related_id}\n    A: ${(c.content || "").substring(0, 150)}\n    B: ${(c.related_content || "").substring(0, 150)}`,
    )
    .join("\n\n")
}

// ─── Tool definition ─────────────────────────────────────────────────────
export const MempalaceTool = Tool.define(
  "mempalace",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const ins = yield* InstanceState.context
          yield* ctx.ask({
            permission: "mempalace",
            patterns: [params.operation],
            always: ["*"],
            metadata: { operation: params.operation },
          })

          const projectId = createHash("sha256").update(ins.worktree).digest("hex").slice(0, 16)
          const dataDir = path.join(os.homedir(), ".local", "share", "opencode", projectId, "mempalace")

          try {
            yield* Effect.promise(() => ensureBridge(dataDir))
          } catch (err) {
            return {
              title: "MemPalace Error",
              metadata: { operation: params.operation, error: true, raw: null },
              output: `Failed to start bridge: ${err}\n\nEnsure mempalace is installed: pip install mempalace`,
            }
          }

          const request: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) request[key] = value
          }

          let raw: unknown
          try {
            raw = yield* Effect.promise(() => ipcCall(request))
          } catch (err) {
            return {
              title: "MemPalace Error",
              metadata: { operation: params.operation, error: true, raw: null },
              output: `Operation '${params.operation}' failed: ${err}`,
            }
          }

          let title = "MemPalace"
          let output = ""
          const data = raw as Record<string, unknown>

          switch (params.operation) {
            // ── MemPalace native ──
            case "search": {
              const results = (data?.results ?? []) as unknown[]
              title = `Search (${results.length} results)`
              output = fmtMemoryList(results)
              break
            }
            case "store": {
              title = "Drawer Stored"
              output =
                data?.success === false
                  ? `Failed: ${data?.error}`
                  : `Stored.\n  ID: ${data?.drawer_id}\n  Location: ${data?.wing}/${data?.room}`
              break
            }
            case "status": {
              title = "Palace Status"
              const lines = [`Total drawers: ${data?.total_drawers ?? 0}`]
              const wings = data?.wings as Record<string, number> | undefined
              if (wings && Object.keys(wings).length > 0)
                lines.push(
                  `Wings: ${Object.entries(wings)
                    .map(([k, v]) => `${k}(${v})`)
                    .join(", ")}`,
                )
              if (data?.palace_path) lines.push(`Path: ${data.palace_path}`)
              if (data?.vector_disabled) lines.push(`WARNING: Vector search disabled — ${data?.vector_disabled_reason}`)
              output = lines.join("\n")
              break
            }
            case "list_wings": {
              const wings = data?.wings as Record<string, number> | undefined
              title = `Wings (${wings ? Object.keys(wings).length : 0})`
              output =
                wings && Object.keys(wings).length
                  ? Object.entries(wings)
                      .map(([n, c]) => `${n}: ${c} drawers`)
                      .join("\n")
                  : "No wings."
              break
            }
            case "list_rooms": {
              const rooms = data?.rooms as Record<string, number> | undefined
              title = `Rooms (${rooms ? Object.keys(rooms).length : 0})`
              output =
                rooms && Object.keys(rooms).length
                  ? Object.entries(rooms)
                      .map(([n, c]) => `${n}: ${c} drawers`)
                      .join("\n")
                  : "No rooms."
              break
            }
            case "kg_add": {
              title = "KG — Added"
              output = data?.success === false ? `Failed: ${data?.error}` : `Added: ${data?.fact}`
              break
            }
            case "kg_query": {
              const facts = (data?.facts ?? []) as unknown[]
              title = `KG — ${params.entity} (${facts.length})`
              output = facts.length
                ? facts
                    .map((f: any) => `${f.subject} —[${f.predicate}]→ ${f.object}${f.ended ? " [ended]" : ""}`)
                    .join("\n")
                : `No facts for: ${params.entity}`
              break
            }
            case "kg_invalidate": {
              title = "KG — Invalidated"
              output = data?.success === false ? `Failed: ${data?.error}` : `Invalidated: ${data?.fact}`
              break
            }
            case "diary_write": {
              title = "Diary Written"
              output =
                data?.success === false
                  ? `Failed: ${data?.error}`
                  : `Logged.\n  ID: ${data?.entry_id}\n  Agent: ${data?.agent}`
              break
            }
            case "diary_read": {
              const entries = (data?.entries ?? []) as Array<Record<string, unknown>>
              title = `Diary (${entries.length})`
              output = entries.length
                ? entries.map((e) => `[${e.timestamp ?? e.date}] (${e.topic})\n${e.content}`).join("\n\n")
                : ((data?.message as string) ?? "No entries.")
              break
            }
            // ── Rekal engine ──
            case "memory_store": {
              title = "Memory Stored"
              output =
                data?.success === false
                  ? `Failed: ${data?.error}`
                  : `Stored.\n  ID: ${data?.memory_id}\n  Type: ${data?.memory_type}\n  Location: ${data?.wing}/${data?.room}`
              break
            }
            case "memory_search": {
              const results = (data?.results ?? []) as unknown[]
              const weights = data?.weights as Record<string, number> | undefined
              title = `Memory Search (${results.length} of ${data?.total_candidates ?? "?"} candidates)`
              let header = ""
              if (weights)
                header = `Weights: fts=${weights.w_fts} vec=${weights.w_vec} recency=${weights.w_recency} half_life=${weights.half_life}\n\n`
              output = header + fmtMemoryList(results)
              break
            }
            case "memory_update": {
              title = "Memory Updated"
              output = data?.success === false ? `Failed: ${data?.error}` : `Updated: ${data?.memory_id}`
              break
            }
            case "memory_supersede": {
              title = "Memory Superseded"
              output = data?.success === false ? `Failed: ${data?.error}` : `${data?.fact}`
              break
            }
            case "memory_delete": {
              title = "Memory Deleted"
              output = data?.success === false ? `Failed: ${data?.error}` : `Deleted: ${data?.memory_id}`
              break
            }
            case "memory_link": {
              title = "Memory Linked"
              output =
                data?.success === false
                  ? `Failed: ${data?.error}`
                  : `Linked: ${data?.from} —[${data?.relation}]→ ${data?.to}`
              break
            }
            case "build_context": {
              const memories = (data?.memories ?? []) as unknown[]
              const conflicts = (data?.conflicts ?? []) as any[]
              title = `Context (${memories.length} memories, ${conflicts.length} conflicts)`
              const parts = [data?.timeline_summary ?? ""]
              if (memories.length) {
                parts.push("")
                parts.push("Memories:")
                parts.push(fmtMemoryList(memories))
              }
              if (conflicts.length) {
                parts.push("")
                parts.push("Conflicts:")
                parts.push(fmtConflicts(conflicts))
              }
              output = parts.join("\n")
              break
            }
            case "memory_conflicts": {
              const conflicts = (Array.isArray(data) ? data : []) as any[]
              title = `Conflicts (${conflicts.length})`
              output = fmtConflicts(conflicts)
              break
            }
            case "memory_health": {
              title = "Memory Health"
              const lines = [
                `Total: ${data?.total_memories ?? 0} (${data?.active_memories ?? 0} active, ${data?.total_superseded ?? 0} superseded)`,
                `Links: ${data?.total_links ?? 0} | Conflicts: ${data?.total_conflicts ?? 0}`,
              ]
              if (data?.oldest_memory) lines.push(`Range: ${data.oldest_memory} → ${data?.newest_memory}`)
              const byType = data?.memories_by_type as Record<string, number> | undefined
              if (byType && Object.keys(byType).length)
                lines.push(
                  `By type: ${Object.entries(byType)
                    .map(([k, v]) => `${k}(${v})`)
                    .join(", ")}`,
                )
              const byProj = data?.memories_by_project as Record<string, number> | undefined
              if (byProj && Object.keys(byProj).length)
                lines.push(
                  `By project: ${Object.entries(byProj)
                    .map(([k, v]) => `${k}(${v})`)
                    .join(", ")}`,
                )
              output = lines.join("\n")
              break
            }
            case "memory_similar": {
              const results = ((data as any)?.results ?? []) as unknown[]
              title = `Similar (${results.length})`
              output = fmtMemoryList(results)
              break
            }
            case "memory_topics": {
              const topics = (Array.isArray(data) ? data : []) as any[]
              title = `Topics (${topics.length})`
              output = topics.length
                ? topics.map((t: any) => `${t.topic}: ${t.count} memories (latest: ${t.latest})`).join("\n")
                : "No topics."
              break
            }
            case "memory_timeline": {
              const items = (Array.isArray(data) ? data : []) as unknown[]
              title = `Timeline (${items.length})`
              output = fmtMemoryList(items)
              break
            }
            case "memory_related": {
              const links = (Array.isArray(data) ? data : []) as any[]
              title = `Related (${links.length})`
              output = links.length
                ? links.map((l: any) => `[${l.relation}] ${l.id}: ${(l.content || "").substring(0, 200)}`).join("\n\n")
                : "No links."
              break
            }
            case "contradiction_check": {
              const contras = (data?.contradictions ?? []) as any[]
              title = `Contradiction Check — ${data?.verdict} (${contras.length})`
              const lines = [`Statement: ${data?.statement ?? params.statement}`, `Verdict: ${data?.verdict}`]
              if (contras.length) {
                lines.push("")
                for (const c of contras)
                  lines.push(`  [${c.type}] confidence=${c.confidence} — ${c.reason}\n    Fact: ${c.fact}`)
              }
              output = lines.join("\n")
              break
            }
            case "fact_check": {
              title = `Fact Check — ${data?.verdict} (${data?.confidence})`
              const lines = [
                `Claim: ${data?.claim ?? params.claim}`,
                `Verdict: ${data?.verdict}`,
                `Confidence: ${data?.confidence}`,
              ]
              const supp = (data?.supporting_evidence ?? []) as any[]
              const contra = (data?.contradicting_evidence ?? []) as any[]
              if (supp.length) {
                lines.push("")
                lines.push("Supporting:")
                for (const s of supp) lines.push(`  [${s.type}] ${s.fact ?? s.text ?? ""}`)
              }
              if (contra.length) {
                lines.push("")
                lines.push("Contradicting:")
                for (const c of contra) lines.push(`  [${c.type}] ${c.fact ?? c.reason ?? ""}`)
              }
              output = lines.join("\n")
              break
            }
            case "multi_hop": {
              const paths = (data?.paths ?? []) as any[]
              title = `Multi-Hop — ${data?.start}${data?.target ? ` → ${data.target}` : ""} (${paths.length} paths)`
              const lines = [
                `Start: ${data?.start}`,
                `Explored: ${data?.graph_explored} nodes, ${data?.reachable_entities} reachable`,
              ]
              if (paths.length) {
                lines.push("")
                for (const p of paths) lines.push(`  [${p.hops} hops] ${(p.path ?? []).join(" ")}`)
              }
              const reachable = (data?.reachable ?? []) as string[]
              if (reachable.length) lines.push(`\nReachable: ${reachable.join(", ")}`)
              output = lines.join("\n")
              break
            }
            case "set_config": {
              title = "Config Set"
              output =
                data?.success === false
                  ? `Failed: ${data?.error}`
                  : `Set ${data?.key}=${data?.value} for project '${data?.project}'`
              break
            }
            default: {
              output = JSON.stringify(raw, null, 2)
            }
          }

          return { title, metadata: { operation: params.operation, error: false, raw }, output }
        }).pipe(Effect.orDie),
    }
  }),
)
