export function compressJson(content: string, maxChars: number): string {
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

  private peek() { return this.input[this.pos] ?? "" }
  private advance() { return this.input[this.pos++]! }

  private parseValue(): unknown {
    this.skipWhitespace()
    const c = this.peek()
    if (c === "{") return this.parseObject()
    if (c === "[") return this.parseArray()
    if (c === '"') return this.parseString()
    if (c === "t" || c === "f") return this.parseBoolean()
    if (c === "n") { this.pos += 4; return null }
    return this.parseNumber()
  }

  private parseObject(): Record<string, unknown> {
    this.advance()
    const obj: Record<string, unknown> = {}
    this.skipWhitespace()
    if (this.peek() === "}") { this.advance(); return obj }
    while (true) {
      this.skipWhitespace()
      const key = this.parseString()
      this.skipWhitespace(); this.advance()
      obj[key] = this.parseValue()
      this.skipWhitespace()
      if (this.peek() === ",") { this.advance(); continue }
      break
    }
    this.skipWhitespace(); this.advance()
    return obj
  }

  private parseArray(): unknown[] {
    this.advance()
    const arr: unknown[] = []
    this.skipWhitespace()
    if (this.peek() === "]") { this.advance(); return arr }
    while (true) {
      arr.push(this.parseValue())
      this.skipWhitespace()
      if (this.peek() === ",") { this.advance(); continue }
      break
    }
    this.skipWhitespace(); this.advance()
    return arr
  }

  private parseString(): string {
    this.skipWhitespace(); this.expect('"')
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
    if (this.input.slice(this.pos, this.pos + 4) === "true") { this.pos += 4; return true }
    this.pos += 5
    return false
  }

  private expect(char: string) {
    if (this.advance() !== char) throw new Error(`Expected '${char}'`)
  }
}

function compressJsonArray(arr: unknown[], maxChars: number): string {
  if (arr.length === 0) return "[]"

  const dictItems = arr.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item)) as Record<string, unknown>[]

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

function compressSharedKeysArray(
  items: Record<string, unknown>[],
  sharedKeys: string[],
  maxChars: number,
): string {
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
