// Compaction-boundary lifecycle pass.
//
// Runs only on the cloned head that feeds the compaction summary, immediately
// before it is serialized. Compaction already rewrites context on purpose, so
// mutating these copies cannot invalidate prompt caching mid-conversation.
//
// Two passes, in order:
//   1. Read lifecycle — a completed `read` whose file was modified later by a
//      write-ish tool is replaced with a stale marker; a read that a newer read
//      of the same path supersedes is replaced with a superseded marker. The
//      newest read of a path is never marked superseded.
//   2. Cross-turn dedup — completed tool outputs of >= 200 chars that appear
//      more than once keep only their latest occurrence; earlier copies become
//      a pointer marker.
//
// Deterministic and fail-open: the pass never throws and returns 0 without
// mutating anything when the input is malformed.

import { createHash } from "node:crypto"
import type { SessionV1 } from "@opencode-ai/core/v1/session"

const WRITE_TOOL_RE = /write|edit|patch|create|delete|move|rename/i
const PATH_KEYS = new Set(["path", "filepath", "file"])
const PROTECTED_TOOLS = new Set(["skill"])
const DEDUP_MIN_CHARS = 200
const MARKER_PREFIX = "[Tool result:"

type Entry = {
  order: number
  part: SessionV1.ToolPart
}

type Located = Entry & {
  path: string
}

function extractPath(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string" || value.length === 0) continue
    if (PATH_KEYS.has(key.toLowerCase())) return value
  }
  return undefined
}

function isWriteTool(tool: string): boolean {
  return WRITE_TOOL_RE.test(tool)
}

function hashOutput(output: string): string {
  return createHash("sha1").update(output).digest("hex")
}

export function applyReadLifecycle(messages: SessionV1.WithParts[]): number {
  if (!Array.isArray(messages) || messages.length === 0) return 0
  try {
    const entries: Entry[] = []
    let order = 0
    for (const message of messages) {
      const parts = message?.parts
      if (!Array.isArray(parts)) continue
      for (const part of parts) {
        if (!part || typeof part !== "object" || part.type !== "tool") continue
        if (typeof part.tool !== "string" || PROTECTED_TOOLS.has(part.tool)) continue
        if (!part.state || typeof part.state !== "object") continue
        entries.push({ order: order++, part })
      }
    }

    const reads: Located[] = []
    const writes: Located[] = []
    for (const entry of entries) {
      const state = entry.part.state
      if (entry.part.tool === "read") {
        if (state.status !== "completed" || state.time?.compacted) continue
        const path = extractPath(state.input)
        if (path !== undefined) reads.push({ ...entry, path })
        continue
      }
      if (isWriteTool(entry.part.tool) && (state.status === "completed" || state.status === "running")) {
        const path = extractPath(state.input)
        if (path !== undefined) writes.push({ ...entry, path })
      }
    }

    const replacements: Array<{ part: SessionV1.ToolPart; output: string }> = []
    const scheduled = new Set<SessionV1.ToolPart>()
    for (const read of reads) {
      const staleBy = writes.find((write) => write.path === read.path && write.order > read.order)
      if (staleBy) {
        scheduled.add(read.part)
        replacements.push({
          part: read.part,
          output: `[Tool result: ${read.path} — stale: modified later by ${staleBy.part.tool}; re-read for current contents]`,
        })
        continue
      }
      const superseded = reads.some((other) => other.path === read.path && other.order > read.order)
      if (superseded) {
        scheduled.add(read.part)
        replacements.push({
          part: read.part,
          output: `[Tool result: ${read.path} — superseded by a newer read of the same file]`,
        })
      }
    }

    const buckets = new Map<string, Entry[]>()
    for (const entry of entries) {
      const state = entry.part.state
      if (state.status !== "completed") continue
      if (state.time?.compacted) continue
      if (typeof state.output !== "string" || state.output.length < DEDUP_MIN_CHARS) continue
      if (state.output.startsWith(MARKER_PREFIX)) continue
      if (scheduled.has(entry.part)) continue
      const hash = hashOutput(state.output)
      const bucket = buckets.get(hash)
      if (bucket) bucket.push(entry)
      else buckets.set(hash, [entry])
    }
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue
      const latest = bucket[bucket.length - 1]
      for (const duplicate of bucket.slice(0, -1)) {
        replacements.push({
          part: duplicate.part,
          output: `[Tool result: identical to a later ${latest.part.tool} call]`,
        })
      }
    }

    for (const replacement of replacements) {
      const state = replacement.part.state
      if (state.status !== "completed") continue
      state.output = replacement.output
    }
    return replacements.length
  } catch {
    return 0
  }
}
