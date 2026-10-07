// JSON compressor with Headroom-derived Phase 2 upgrades.
//
// `compressJsonLegacy` is the pre-upgrade behavior, preserved byte-for-byte
// as the baseline (exported for the no-growth invariant test). `compressJson`
// layers three improvements on top, each adopted only when it strictly
// shrinks the output:
//
//   1. identical-item dedup for arrays;
//   2. lossless `[N]{schema}` CSV-schema render (Headroom `csv-schema`),
//      adopted when it round-trips to the same values and saves >= 15% bytes;
//   3. item-aware truncation when maxChars forces a cut: first, last, every
//      error-keyword item and >2σ numeric anomalies are retained, then the
//      rest fills in order, with a trailing `... N items omitted` line.
//
// All new paths fail open: any error returns the legacy output, and no path
// can produce a string longer than the legacy output for the same input.

export function compressJson(content: string, maxChars: number): string {
  const baseline = compressJsonLegacy(content, maxChars)
  try {
    return compressJsonUpgraded(content, maxChars, baseline)
  } catch {
    return baseline
  }
}

function compressJsonUpgraded(content: string, maxChars: number, baseline: string): string {
  const value = parseJsonForUpgrade(content)
  if (!Array.isArray(value)) return baseline

  let best = baseline
  let working: unknown[] = value

  const deduped = dedupIdenticalItems(value)
  if (deduped.length < value.length) {
    const text = JSON.stringify(deduped)
    if (text.length < best.length) {
      best = text
      working = deduped
    }
  }

  const csv = renderCsvSchema(working)
  if (csv !== null && csv.length < best.length && csv.length <= best.length * 0.85) {
    const roundTripped = parseCsvSchema(csv)
    if (roundTripped !== null && stableStringify(roundTripped) === stableStringify(working)) best = csv
  }

  if (JSON.stringify(working).length > maxChars) {
    const retained = renderRetained(working, maxChars)
    if (retained !== null && retained.length < best.length) best = retained
  }

  return best
}

function parseJsonForUpgrade(content: string): unknown {
  const stripped = content.trim()
  if (!stripped) return undefined
  try {
    return JSON.parse(stripped)
  } catch {
    const normalized = tryNormalizeConcatenatedJson(stripped)
    if (!normalized) return undefined
    try {
      return JSON.parse(normalized)
    } catch {
      return undefined
    }
  }
}

export function compressJsonLegacy(content: string, maxChars: number): string {
  const stripped = content.trim()
  if (!stripped) return content

  let value: unknown
  try {
    value = JSON.parse(stripped)
  } catch {
    const normalized = tryNormalizeConcatenatedJson(stripped)
    if (normalized) {
      try {
        value = JSON.parse(normalized)
      } catch {
        return content
      }
    } else {
      return content
    }
  }

  if (Array.isArray(value)) return compressJsonArray(value, maxChars)
  if (typeof value === "object" && value !== null) return compressJsonObject(value as Record<string, unknown>, maxChars)
  return content
}

function tryNormalizeConcatenatedJson(content: string): string | null {
  if (!content.startsWith("{")) return null
  const decoder = new ConcatenatedJsonDecoder()
  try {
    const items = decoder.decode(content)
    if (items.length < 2) return null
    if (!items.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) return null
    return JSON.stringify(items)
  } catch {
    return null
  }
}

class ConcatenatedJsonDecoder {
  private pos = 0
  private input = ""

  decode(input: string): unknown[] {
    this.input = input
    this.pos = 0
    const items: unknown[] = []
    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break
      items.push(this.parseValue())
    }
    return items
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) this.pos++
  }

  private peek() {
    return this.input[this.pos] ?? ""
  }
  private advance() {
    return this.input[this.pos++]!
  }

  private parseValue(): unknown {
    this.skipWhitespace()
    const c = this.peek()
    if (c === "{") return this.parseObject()
    if (c === "[") return this.parseArray()
    if (c === '"') return this.parseString()
    if (c === "t" || c === "f") return this.parseBoolean()
    if (c === "n") {
      this.pos += 4
      return null
    }
    return this.parseNumber()
  }

  private parseObject(): Record<string, unknown> {
    this.advance()
    const obj: Record<string, unknown> = {}
    this.skipWhitespace()
    if (this.peek() === "}") {
      this.advance()
      return obj
    }
    while (true) {
      this.skipWhitespace()
      const key = this.parseString()
      this.skipWhitespace()
      this.advance()
      obj[key] = this.parseValue()
      this.skipWhitespace()
      if (this.peek() === ",") {
        this.advance()
        continue
      }
      break
    }
    this.skipWhitespace()
    this.advance()
    return obj
  }

  private parseArray(): unknown[] {
    this.advance()
    const arr: unknown[] = []
    this.skipWhitespace()
    if (this.peek() === "]") {
      this.advance()
      return arr
    }
    while (true) {
      arr.push(this.parseValue())
      this.skipWhitespace()
      if (this.peek() === ",") {
        this.advance()
        continue
      }
      break
    }
    this.skipWhitespace()
    this.advance()
    return arr
  }

  private parseString(): string {
    this.skipWhitespace()
    this.expect('"')
    let result = ""
    while (true) {
      const c = this.advance()
      if (c === '"') break
      if (c === "\\") {
        const esc = this.advance()
        if (esc === "n") result += "\n"
        else if (esc === "t") result += "\t"
        else if (esc === "\\") result += "\\"
        else if (esc === '"') result += '"'
        else result += esc
      } else {
        result += c
      }
    }
    return result
  }

  private parseNumber(): number {
    this.skipWhitespace()
    let s = ""
    if (this.peek() === "-") s += this.advance()
    while (this.pos < this.input.length && /[0-9.eE+-]/.test(this.input[this.pos]!)) s += this.advance()
    return Number(s)
  }

  private parseBoolean(): boolean {
    this.skipWhitespace()
    if (this.input.slice(this.pos, this.pos + 4) === "true") {
      this.pos += 4
      return true
    }
    this.pos += 5
    return false
  }

  private expect(char: string) {
    if (this.advance() !== char) throw new Error(`Expected '${char}'`)
  }
}

function compressJsonArray(arr: unknown[], maxChars: number): string {
  if (arr.length === 0) return "[]"

  const dictItems = arr.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) as Record<
    string,
    unknown
  >[]

  if (dictItems.length === arr.length && dictItems.length >= 2) {
    return compressDictArray(dictItems, maxChars)
  }

  if (arr.length > 20) {
    const sample = arr.slice(0, 10)
    const result = JSON.stringify(sample) + `\n... (${arr.length - 10} more items)`
    if (result.length < arr.length * 4) return result
  }

  const result = JSON.stringify(arr)
  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}

function compressDictArray(items: Record<string, unknown>[], maxChars: number): string {
  const allKeys = new Set<string>()
  for (const item of items) {
    for (const key of Object.keys(item)) allKeys.add(key)
  }

  const keyFrequency = new Map<string, number>()
  for (const key of allKeys) {
    let count = 0
    for (const item of items) {
      if (key in item) count++
    }
    keyFrequency.set(key, count)
  }

  const sharedKeys = [...allKeys].filter((key) => {
    const freq = keyFrequency.get(key) ?? 0
    return freq >= items.length * 0.8
  })

  if (sharedKeys.length >= 2) {
    return compressSharedKeysArray(items, sharedKeys, maxChars)
  }

  if (items.length > 5) {
    const schema = sharedKeys.length > 0 ? sharedKeys : [...allKeys].slice(0, 5)
    const sample = items.slice(0, 5)
    const compressed = { _schema: schema, _count: items.length, _sample: sample }
    const result = JSON.stringify(compressed)
    if (result.length <= maxChars) return result
    return result.slice(0, maxChars)
  }

  const result = JSON.stringify(items)
  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}

function compressSharedKeysArray(items: Record<string, unknown>[], sharedKeys: string[], maxChars: number): string {
  const uniqueRows: Record<string, unknown>[] = []
  const fingerprints = new Map<string, number>()
  let dupeCount = 0

  for (const item of items) {
    const fingerprint = JSON.stringify(
      sharedKeys.map((key) => {
        const val = item[key]
        if (typeof val === "object" && val !== null) return JSON.stringify(val)
        return String(val)
      }),
    )

    const existingIdx = fingerprints.get(fingerprint)
    if (existingIdx !== undefined) {
      dupeCount++
      continue
    }

    fingerprints.set(fingerprint, uniqueRows.length)
    const row: Record<string, unknown> = {}
    for (const key of sharedKeys) {
      const val = item[key]
      if (val !== undefined && val !== null) row[key] = val
    }
    for (const key of Object.keys(item)) {
      if (!sharedKeys.includes(key)) row[key] = item[key]
    }
    uniqueRows.push(row)
  }

  if (dupeCount === 0) {
    const result = JSON.stringify(items)
    if (result.length <= maxChars) return result
    return result.slice(0, maxChars)
  }

  const compressed = {
    _columns: sharedKeys,
    _deduped_from: items.length,
    _rows: uniqueRows,
  }

  let result = JSON.stringify(compressed)
  if (result.length > maxChars) {
    const truncated = { _columns: sharedKeys, _deduped_from: items.length, _sample: uniqueRows.slice(0, 5) }
    result = JSON.stringify(truncated)
  }
  return result
}

function compressJsonObject(obj: Record<string, unknown>, maxChars: number): string {
  const keys = Object.keys(obj)
  if (keys.length > 20) {
    const important = keys.slice(0, 15)
    const truncated: Record<string, unknown> = {}
    for (const key of important) truncated[key] = obj[key]
    truncated[`... +${keys.length - 15} more keys`] = true
    const result = JSON.stringify(truncated)
    if (result.length <= maxChars) return result
    return result.slice(0, maxChars)
  }

  const result = JSON.stringify(obj)
  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}

// ─── Identical-item dedup ────────────────────────────────────────────────

function dedupIdenticalItems(arr: unknown[]): unknown[] {
  const seen = new Set<string>()
  const kept: unknown[] = []
  for (const item of arr) {
    const key = stableStringify(item)
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(item)
  }
  return kept
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value))
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) sorted[key] = sortObjectKeys(source[key])
    return sorted
  }
  return value
}

// ─── CSV-schema render / parse (Headroom `csv-schema`) ───────────────────
//
// `[N]{col:type,col:type?}` followed by one CSV row per item, newline
// terminated. Cell contract (mirrors Headroom's formatter/decoder pair):
//
//   missing key        empty cell
//   JSON null          bare `null`
//   ""                 quoted `""`
//   literal "null"     quoted `"null"`
//   string w/ `,"`\n   CSV-quoted (quotes doubled)
//   number / bool      bare
//   object / array     CSV-quoted compact JSON

type CsvColumnType = "int" | "float" | "bool" | "string" | "json" | "null"

interface CsvColumn {
  name: string
  type: CsvColumnType
  nullable: boolean
}

interface CsvCell {
  quoted: boolean
  value: string
}

export function renderCsvSchema(items: unknown[]): string | null {
  if (items.length < 2) return null
  if (!items.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) return null

  const objects = items as Record<string, unknown>[]
  const frequency = new Map<string, number>()
  for (const obj of objects) {
    for (const key of Object.keys(obj)) frequency.set(key, (frequency.get(key) ?? 0) + 1)
  }

  const keys = [...frequency.keys()].sort((a, b) => {
    const byFrequency = frequency.get(b)! - frequency.get(a)!
    if (byFrequency !== 0) return byFrequency
    return a < b ? -1 : a > b ? 1 : 0
  })

  const columns: CsvColumn[] = keys.map((name) => {
    const present = objects.filter((obj) => Object.prototype.hasOwnProperty.call(obj, name))
    const nullable = present.length < objects.length || present.some((obj) => obj[name] === null)
    return { name, type: inferCsvType(present.map((obj) => obj[name])), nullable }
  })

  const header = `[${items.length}]{${columns
    .map((column) => `${column.name}:${column.type}${column.nullable ? "?" : ""}`)
    .join(",")}}`

  const lines = [header]
  for (const obj of objects) {
    lines.push(columns.map((column) => renderCsvCell(obj, column.name)).join(","))
  }
  return lines.join("\n") + "\n"
}

function inferCsvType(values: unknown[]): CsvColumnType {
  let tag: CsvColumnType | null = null
  for (const value of values) {
    if (value === null) continue
    const current = csvTypeOf(value)
    if (tag === null) tag = current
    else if (tag !== current) return "json"
  }
  return tag ?? "string"
}

function csvTypeOf(value: unknown): CsvColumnType {
  if (typeof value === "boolean") return "bool"
  if (typeof value === "number") return Number.isFinite(value) && Number.isInteger(value) ? "int" : "float"
  if (typeof value === "string") return "string"
  return "json"
}

function renderCsvCell(obj: Record<string, unknown>, name: string): string {
  if (!Object.prototype.hasOwnProperty.call(obj, name)) return ""
  return renderCsvValue(obj[name])
}

function renderCsvValue(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") {
    if (value === "" || value === "null" || needsCsvQuote(value)) return csvQuote(value)
    return value
  }
  return csvQuote(JSON.stringify(value) ?? "")
}

function needsCsvQuote(value: string): boolean {
  return value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")
}

function csvQuote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function parseCsvSchema(text: string): unknown[] | null {
  const firstLine = text.split("\n", 1)[0] ?? ""
  const header = /^\[(\d+)\]\{([^}]*)\}\s*$/.exec(firstLine)
  if (!header) return null

  const declared = Number(header[1])
  const columns = header[2] === "" ? [] : header[2].split(",").map(parseCsvColumn)
  const rows = splitDataRows(text.slice(firstLine.length + 1), declared)

  const out: Record<string, unknown>[] = []
  for (const row of rows) {
    const record: Record<string, unknown> = {}
    for (let index = 0; index < columns.length; index++) {
      const cell = row[index]
      if (!cell) break
      const decoded = decodeCsvCell(cell, columns[index]!.type)
      if (decoded.present) record[columns[index]!.name] = decoded.value
    }
    out.push(record)
  }
  return out
}

function parseCsvColumn(declaration: string): CsvColumn {
  const separator = declaration.lastIndexOf(":")
  let name = separator >= 0 ? declaration.slice(0, separator) : declaration
  let tag = separator >= 0 ? declaration.slice(separator + 1) : "string"
  const nullable = tag.endsWith("?")
  if (nullable) tag = tag.slice(0, -1)
  let type: CsvColumnType = "string"
  if (tag === "int" || tag === "float" || tag === "bool" || tag === "json" || tag === "null") type = tag
  if (!name) {
    name = tag
    type = "string"
  }
  return { name, type, nullable }
}

function splitDataRows(blob: string, declared: number): CsvCell[][] {
  const rows = parseCsvRows(blob).filter((row) => row.length > 0)
  // The formatter newline-terminates every row, so a lone empty cell that
  // exceeds the declared count is a trailing-newline artifact.
  if (declared >= 0 && rows.length === declared + 1 && rows[rows.length - 1]!.length === 1) {
    const last = rows[rows.length - 1]![0]!
    if (!last.quoted && last.value === "") rows.pop()
  }
  return rows
}

function parseCsvRows(blob: string): CsvCell[][] {
  const rows: CsvCell[][] = []
  let row: CsvCell[] = []
  let i = 0
  const n = blob.length

  while (i < n) {
    if (blob[i] === '"') {
      i++
      let value = ""
      while (i < n) {
        if (blob[i] === '"') {
          if (i + 1 < n && blob[i + 1] === '"') {
            value += '"'
            i += 2
            continue
          }
          i++
          break
        }
        value += blob[i]
        i++
      }
      row.push({ quoted: true, value })
      if (i < n && blob[i] === "\r") i++
      if (i < n && blob[i] === ",") i++
      else if (i < n && blob[i] === "\n") {
        rows.push(row)
        row = []
        i++
      }
    } else {
      let j = i
      while (j < n && blob[j] !== "," && blob[j] !== "\n") j++
      let value = blob.slice(i, j)
      if (value.endsWith("\r")) value = value.slice(0, -1)
      row.push({ quoted: false, value })
      if (j < n && blob[j] === "\n") {
        rows.push(row)
        row = []
      }
      i = j + 1
    }
  }

  if (row.length > 0) rows.push(row)
  return rows
}

function decodeCsvCell(cell: CsvCell, type: CsvColumnType): { present: boolean; value: unknown } {
  if (cell.quoted) {
    if (type === "json") return decodeJsonCell(cell.value)
    return { present: true, value: cell.value }
  }
  if (cell.value === "") return { present: false, value: null }
  if (cell.value === "null") return { present: true, value: null }
  if (type === "int") {
    const parsed = Number(cell.value)
    return Number.isFinite(parsed) && Number.isInteger(parsed)
      ? { present: true, value: parsed }
      : { present: true, value: cell.value }
  }
  if (type === "float") {
    const parsed = Number(cell.value)
    return Number.isFinite(parsed) ? { present: true, value: parsed } : { present: true, value: cell.value }
  }
  if (type === "bool") return { present: true, value: cell.value === "true" }
  if (type === "json") return decodeJsonCell(cell.value)
  return { present: true, value: cell.value }
}

function decodeJsonCell(value: string): { present: true; value: unknown } {
  try {
    const parsed = JSON.parse(value)
    // A quoted `"null"` cell is the literal string "null": JSON null is
    // always rendered as a bare cell, so the quoted form must stay a string.
    if (parsed !== null) return { present: true, value: parsed }
  } catch {}
  return { present: true, value }
}

// ─── Item-aware truncation ───────────────────────────────────────────────
//
// Retains first, last, every error-keyword item and >2σ numeric anomalies,
// then fills the remaining budget in original order. The result carries a
// trailing `... N items omitted` line. Returns null when even the mandatory
// items cannot fit, so the caller keeps the legacy output.

const ERROR_KEYWORD_RE = /(?:error|fail|fatal|exception|panic|denied|timeout|refused)/i
const VARIANCE_THRESHOLD = 2.0

function renderRetained(items: unknown[], maxChars: number): string | null {
  if (items.length === 0) return null

  const parts = items.map((item) => JSON.stringify(item))
  if (parts.some((part) => part === undefined)) return null

  const selected = new Set<number>()
  selected.add(0)
  selected.add(items.length - 1)
  for (let index = 0; index < items.length; index++) {
    if (ERROR_KEYWORD_RE.test(parts[index]!.toLowerCase())) selected.add(index)
  }
  for (const index of numericAnomalyIndices(items)) selected.add(index)

  const indices = [...selected].sort((a, b) => a - b)
  const markerLength = (omitted: number) => (omitted > 0 ? `\n... ${omitted} items omitted`.length : 0)

  let length = 2 + indices.reduce((sum, index) => sum + parts[index]!.length, 0) + Math.max(0, indices.length - 1)
  let omitted = items.length - indices.length
  if (length + markerLength(omitted) > maxChars) return null

  for (let index = 0; index < items.length; index++) {
    if (selected.has(index)) continue
    const nextLength = length + parts[index]!.length + 1
    const nextOmitted = omitted - 1
    if (nextLength + markerLength(nextOmitted) <= maxChars) {
      selected.add(index)
      indices.push(index)
      length = nextLength
      omitted = nextOmitted
    }
  }

  indices.sort((a, b) => a - b)
  const body = `[${indices.map((index) => parts[index]).join(",")}]`
  return omitted > 0 ? body + `\n... ${omitted} items omitted` : body
}

function numericAnomalyIndices(items: unknown[]): number[] {
  const byField = new Map<string, { index: number; value: number }[]>()

  items.forEach((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue
      const values = byField.get(key) ?? []
      values.push({ index, value })
      byField.set(key, values)
    }
  })

  const anomalies = new Set<number>()
  for (const values of byField.values()) {
    if (values.length < 2) continue
    const mean = values.reduce((sum, entry) => sum + entry.value, 0) / values.length
    const variance = values.reduce((sum, entry) => sum + (entry.value - mean) ** 2, 0) / values.length
    const std = Math.sqrt(variance)
    if (!(std > 0)) continue
    for (const entry of values) {
      if (Math.abs(entry.value - mean) > VARIANCE_THRESHOLD * std) anomalies.add(entry.index)
    }
  }

  return [...anomalies].sort((a, b) => a - b)
}
