// Dense-line elision ported from Headroom's dense_line_elider.py.
//
// Tool outputs that dump a fetched page, a bundled asset or an encoded blob
// arrive as a few very long lines with almost no whitespace. A line is "dense"
// when it is long AND nearly whitespace-free; prose, code, logs, indented
// JSON, CSV and markdown all have far more spaces, JSON-shaped lines are left
// to the JSON compressor, and critical lines are never touched.
//
// Elision is lossy, so it is only performed when a retrieval hint is supplied:
// the marker records where the full value came from, and without one the
// function is a pure no-op.

import { isCriticalLine } from "./protection"

export interface DenseLineOptions {
  retrievalHint?: string
  minLineChars?: number
  maxSpaceRatio?: number
  minDenseTotalChars?: number
  headChars?: number
  tailChars?: number
}

export interface DenseLineResult {
  text: string
  elided: number
}

export const MIN_LINE_CHARS = 300
export const MAX_SPACE_RATIO = 0.06
export const MIN_DENSE_TOTAL_CHARS = 2000
export const HEAD_CHARS = 160
export const TAIL_CHARS = 80

function isDenseLine(line: string, minLineChars: number, maxSpaceRatio: number): boolean {
  const length = line.length
  if (length < minLineChars) return false
  // Tabs: TSV / psql -A rows pass the space ratio but are data the agent asked
  // for; minified assets and encoded blobs never carry tabs.
  if (line.includes("\t")) return false
  let spaces = 0
  for (let i = 0; i < length; i++) if (line[i] === " ") spaces++
  if (spaces / length >= maxSpaceRatio) return false
  const stripped = line.trim()
  const jsonShaped =
    (stripped.startsWith("{") || stripped.startsWith("[")) &&
    (stripped.endsWith("}") || stripped.endsWith("]"))
  if (jsonShaped) return false
  return !isCriticalLine(line)
}

export function elideDenseLines(text: string, opts: DenseLineOptions = {}): DenseLineResult {
  if (typeof text !== "string" || text === "") return { text, elided: 0 }
  const retrievalHint = opts.retrievalHint
  if (!retrievalHint) return { text, elided: 0 }
  try {
    const minLineChars = opts.minLineChars ?? MIN_LINE_CHARS
    const maxSpaceRatio = opts.maxSpaceRatio ?? MAX_SPACE_RATIO
    const minDenseTotalChars = opts.minDenseTotalChars ?? MIN_DENSE_TOTAL_CHARS
    const headChars = opts.headChars ?? HEAD_CHARS
    const tailChars = opts.tailChars ?? TAIL_CHARS

    if (text.length < minLineChars) return { text, elided: 0 }
    const lines = text.split("\n")
    let denseTotal = 0
    for (const line of lines) {
      if (isDenseLine(line, minLineChars, maxSpaceRatio)) denseTotal += line.length
    }
    if (denseTotal < minDenseTotalChars) return { text, elided: 0 }

    const out: string[] = []
    let elided = 0
    let savings = 0
    for (const line of lines) {
      if (isDenseLine(line, minLineChars, maxSpaceRatio) && line.length > headChars + tailChars) {
        const omitted = line.length - headChars - tailChars
        const replacement =
          `${line.slice(0, headChars)} ...[elided ${omitted} chars]... ${line.slice(line.length - tailChars)}` +
          ` (retrieve: ${retrievalHint})`
        if (replacement.length < line.length) {
          out.push(replacement)
          elided++
          savings += line.length - replacement.length
          continue
        }
      }
      out.push(line)
    }
    if (elided === 0 || savings < 1) return { text, elided: 0 }
    return { text: out.join("\n"), elided }
  } catch {
    return { text, elided: 0 }
  }
}
