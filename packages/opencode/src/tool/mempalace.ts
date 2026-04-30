import { Effect, Schema } from "effect"
import { createHash } from "crypto"
import * as os from "os"
import * as path from "path"
import { spawn, type ChildProcess } from "child_process"
import * as Tool from "./tool"
import { InstanceState } from "@/effect/instance-state"
import DESCRIPTION from "./mempalace.txt"

// ─── Resolve bridge script path relative to this module ─────────────────
// import.meta.dir is Bun-native; the URL fallback covers Node ESM.
const MODULE_DIR: string =
  (import.meta as any).dir ??
  path.dirname(new URL(import.meta.url).pathname)

const BRIDGE_SCRIPT = path.join(MODULE_DIR, "mempalace_bridge.py")

// ─── Parameter schema ────────────────────────────────────────────────────
export const Parameters = Schema.Struct({
  operation: Schema.Literals([
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
  ]),

  query: Schema.optional(Schema.String),

  content: Schema.optional(Schema.String),

  wing: Schema.optional(Schema.String),

  room: Schema.optional(Schema.String),

  drawer: Schema.optional(Schema.String),

  tags: Schema.optional(Schema.Array(Schema.String)),

  limit: Schema.optional(Schema.Number),

  entity: Schema.optional(Schema.String),

  relation: Schema.optional(Schema.String),

  target: Schema.optional(Schema.String),

  confidence: Schema.optional(Schema.Number),

  entry: Schema.optional(Schema.String),

  depth: Schema.optional(Schema.Number),

  agent_name: Schema.optional(Schema.String),
})

// ─── Subprocess manager (module-level singleton per process) ─────────────

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
      const pendingCopy = _pending.splice(0)
      for (const p of pendingCopy) {
        p.reject(new Error(`mempalace process error: ${err.message}`))
      }
      _proc = null
      _initPromise = null
    })

    _proc.on("exit", (code) => {
      const pendingCopy = _pending.splice(0)
      for (const p of pendingCopy) {
        p.reject(new Error(`mempalace process exited with code ${code}`))
      }
      _proc = null
      _initPromise = null
    })

    const cleanup = () => {
      if (_proc && _proc.exitCode === null) {
        _proc.kill("SIGTERM")
      }
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
          if (msg.status === "ok") {
            resolve()
          } else {
            reject(new Error(msg.message || "bridge startup failed"))
            _proc?.kill("SIGTERM")
            _proc = null
            _initPromise = null
          }
        } catch {
          reject(new Error("bridge readiness parse error"))
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
  if (_proc && _proc.exitCode === null && _currentDataDir === dataDir) {
    return Promise.resolve()
  }

  if (_proc && _proc.exitCode === null && _currentDataDir !== dataDir) {
    _proc.kill("SIGTERM")
    _proc = null
    _initPromise = null
  }

  if (!_initPromise) {
    _initPromise = _spawnBridge(dataDir)
  }

  return _initPromise
}

function ipcCall(request: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!_proc || _proc.exitCode !== null) {
      reject(new Error("mempalace process is not running"))
      return
    }

    _pending.push({
      resolve: (line) => {
        try {
          const response = JSON.parse(line)
          if (response.status === "error") {
            reject(new Error(response.message ?? "unknown mempalace error"))
          } else {
            resolve(response.data)
          }
        } catch {
          reject(new Error("IPC response parse error"))
        }
      },
      reject,
    })

    _proc.stdin!.write(JSON.stringify(request) + "\n")
  })
}

// ─── Format search results for LLM consumption ──────────────────────────
function formatSearchResults(data: unknown): string {
  const envelope = data as Record<string, unknown>
  const results = (envelope?.results ?? []) as Array<Record<string, unknown>>

  if (!results.length) return "No memories found matching your query."

  return results
    .map((r, i) => {
      const similarity = typeof r.similarity === "number" ? r.similarity.toFixed(3) : "?"
      const bm25 = typeof r.bm25_score === "number" ? r.bm25_score.toFixed(2) : ""
      const wing = r.wing ?? "unknown"
      const room = r.room ?? "unknown"
      const source = r.source_file ?? ""
      const created = r.created_at ?? ""
      const text = r.text ?? ""
      const via = r.matched_via ?? "drawer"

      let header = `[${i + 1}] sim=${similarity}`
      if (bm25) header += ` bm25=${bm25}`
      header += ` | ${wing}/${room}`
      if (source && source !== "?") header += ` | ${source}`
      if (created && created !== "unknown") header += ` | ${created}`
      header += ` (${via})`

      return `${header}\n    ${String(text).substring(0, 2000)}`
    })
    .join("\n\n")
}

// ─── Tool definition ─────────────────────────────────────────────────────
export const MempalaceTool = Tool.define(
  "mempalace",
  Effect.gen(function* () {
    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const ins = yield* InstanceState.context

          // Permission check — matches pattern used by all other tools
          yield* ctx.ask({
            permission: "mempalace",
            patterns: [params.operation],
            always: ["*"],
            metadata: {
              operation: params.operation,
            },
          })

          const projectId = createHash("sha256")
            .update(ins.worktree)
            .digest("hex")
            .slice(0, 16)

          const dataDir = path.join(
            os.homedir(),
            ".local",
            "share",
            "opencode",
            projectId,
            "mempalace",
          )

          try {
            yield* Effect.promise(() => ensureBridge(dataDir))
          } catch (err) {
            return {
              title: "MemPalace Error",
              metadata: { operation: params.operation, error: true },
              output: `Failed to start mempalace bridge: ${err}\n\nEnsure mempalace is installed: pip install mempalace`,
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
              metadata: { operation: params.operation, error: true },
              output: `MemPalace operation '${params.operation}' failed: ${err}`,
            }
          }

          let title = "MemPalace"
          let output = ""

          switch (params.operation) {
            case "search": {
              const envelope = raw as Record<string, unknown>
              const results = (envelope?.results ?? []) as unknown[]
              title = `Memory Search (${results.length} results)`
              output = formatSearchResults(raw)
              break
            }
            case "store": {
              const stored = raw as Record<string, unknown>
              title = "Memory Stored"
              if (stored?.success === false) {
                output = `Store failed: ${stored?.error ?? "unknown error"}`
              } else {
                const drawerId = stored?.drawer_id ?? "unknown"
                const wing = stored?.wing ?? params.wing ?? "project"
                const room = stored?.room ?? params.room ?? "general"
                output = `Memory stored successfully.\n  ID: ${drawerId}\n  Location: ${wing}/${room}`
              }
              break
            }
            case "status": {
              const status = raw as Record<string, unknown>
              title = "Palace Status"
              const total = status?.total_drawers ?? 0
              const wings = status?.wings as Record<string, number> | undefined
              const rooms = status?.rooms as Record<string, number> | undefined
              const lines: string[] = [`Total drawers: ${total}`]
              if (wings && Object.keys(wings).length > 0) {
                lines.push(`Wings: ${Object.entries(wings).map(([k, v]) => `${k}(${v})`).join(", ")}`)
              }
              if (rooms && Object.keys(rooms).length > 0) {
                lines.push(`Rooms: ${Object.entries(rooms).map(([k, v]) => `${k}(${v})`).join(", ")}`)
              }
              if (status?.palace_path) {
                lines.push(`Path: ${status.palace_path}`)
              }
              if (status?.vector_disabled) {
                lines.push(`WARNING: Vector search disabled — ${status?.vector_disabled_reason ?? "run mempalace repair"}`)
              }
              output = lines.join("\n")
              break
            }
            case "list_wings": {
              const result = raw as Record<string, unknown>
              const wings = result?.wings as Record<string, number> | undefined
              if (wings && Object.keys(wings).length > 0) {
                title = `Wings (${Object.keys(wings).length})`
                output = Object.entries(wings)
                  .map(([name, count]) => `${name}: ${count} drawers`)
                  .join("\n")
              } else {
                title = "Wings (0)"
                output = "No wings found. The palace is empty."
              }
              break
            }
            case "list_rooms": {
              const result = raw as Record<string, unknown>
              const rooms = result?.rooms as Record<string, number> | undefined
              const wingName = result?.wing ?? params.wing ?? "all"
              if (rooms && Object.keys(rooms).length > 0) {
                title = `Rooms in '${wingName}' (${Object.keys(rooms).length})`
                output = Object.entries(rooms)
                  .map(([name, count]) => `${name}: ${count} drawers`)
                  .join("\n")
              } else {
                title = `Rooms in '${wingName}' (0)`
                output = "No rooms found."
              }
              break
            }
            case "kg_add": {
              const result = raw as Record<string, unknown>
              title = "Knowledge Graph — Assertion Added"
              if (result?.success === false) {
                output = `Failed: ${result?.error ?? "unknown error"}`
              } else {
                output = `Added: ${result?.fact ?? `${params.entity} → ${params.relation} → ${params.target}`}`
              }
              break
            }
            case "kg_query": {
              const result = raw as Record<string, unknown>
              const facts = (result?.facts ?? []) as unknown[]
              title = `Knowledge Graph — ${params.entity} (${facts.length} facts)`
              if (facts.length > 0) {
                output = facts
                  .map((f) => {
                    const fact = f as Record<string, unknown>
                    const s = fact.subject ?? fact.entity ?? "?"
                    const p = fact.predicate ?? fact.relation ?? "?"
                    const o = fact.object ?? fact.target ?? "?"
                    const from = fact.valid_from ? ` (from: ${fact.valid_from})` : ""
                    const ended = fact.ended ? ` [ended: ${fact.ended}]` : ""
                    return `${s} —[${p}]→ ${o}${from}${ended}`
                  })
                  .join("\n")
              } else {
                output = `No facts found for entity: ${params.entity}`
              }
              break
            }
            case "kg_invalidate": {
              const result = raw as Record<string, unknown>
              title = "Knowledge Graph — Assertion Invalidated"
              if (result?.success === false) {
                output = `Failed: ${result?.error ?? "unknown error"}`
              } else {
                output = `Invalidated: ${result?.fact ?? `${params.entity} → ${params.relation} → ${params.target}`}`
              }
              break
            }
            case "diary_write": {
              const result = raw as Record<string, unknown>
              title = "Diary Entry Written"
              if (result?.success === false) {
                output = `Failed: ${result?.error ?? "unknown error"}`
              } else {
                output = `Diary entry logged.\n  ID: ${result?.entry_id ?? "?"}\n  Agent: ${result?.agent ?? params.agent_name ?? "opencode"}\n  Time: ${result?.timestamp ?? "?"}`
              }
              break
            }
            case "diary_read": {
              const result = raw as Record<string, unknown>
              const entries = (result?.entries ?? []) as Array<Record<string, unknown>>
              const showing = result?.showing ?? entries.length
              const total = result?.total ?? entries.length
              title = `Diary (${showing} of ${total} entries)`
              if (entries.length > 0) {
                output = entries
                  .map(
                    (e) =>
                      `[${e.timestamp ?? e.date ?? "?"}] (${e.topic ?? "general"})\n${e.content ?? ""}`,
                  )
                  .join("\n\n")
              } else {
                output = (result?.message as string) ?? "No diary entries found."
              }
              break
            }
            default: {
              title = "MemPalace"
              output = JSON.stringify(raw, null, 2)
            }
          }

          return {
            title,
            metadata: { operation: params.operation, raw },
            output,
          }
        }).pipe(Effect.orDie),
    }
  }),
)