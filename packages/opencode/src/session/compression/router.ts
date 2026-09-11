import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import { compressJson } from "./json"
import { compressLog } from "./log"
import { compressSearch } from "./search"
import { extractHtml } from "./html"
import { compressConfig } from "./config"
import { compressCode } from "./code"
import { compressCsv } from "./csv"

export type ContentType =
  | "json"
  | "log"
  | "search"
  | "html"
  | "config"
  | "code"
  | "csv"
  | "text"

export interface DetectionResult {
  type: ContentType
  confidence: number
}

export interface CompressOptions {
  maxChars?: number
  compressors?: ConfigV1.Info["compression"]
}

const HTML_DOCTYPE = /^\s*<!doctype\s+html/i
const HTML_TAG = /<html[\s>]/i
const HTML_BODY = /<body[\s>]/i
const HTML_STRUCTURAL = /<(div|span|script|style|link|meta|nav|header|footer|aside|article|section|main)[\s>]/i

const SEARCH_LINE = /^[^\s:]+:\d+:/
const SEARCH_PATH_PREFIX = /^[^\s<>="]+/

const CONFIG_SECTION = /^\s*\[\[?[\w.\-"' ]+\]\]?\s*$/
const CONFIG_YAML_KEY = /^\s*(?:-\s+)?(?:[\w.\-/]+|"[^"]+"|'[^']+')\s*:(?:\s|$)/
const CONFIG_COMMENT = /^\s*[#;]/

const LOG_LEVEL = /\b(?:ERROR|FAIL|FAILED|FATAL|CRITICAL|WARN|WARNING|INFO|DEBUG|TRACE)\b/i
const LOG_STACK_TRACE = /^\s*(?:Traceback \(most recent call last\)|File ".+", line \d+|at .+\(.+:\d+:\d+\)|panic|goroutine \d+|thread '[^']*' panicked)/
const LOG_SUMMARY = /^={3,}|^-{3,}|^\d+ (?:passed|failed|skipped)/

const CODE_PATTERNS: Record<string, RegExp[]> = {
  python: [/^\s*(?:def|class|import|from|async def)\s+\w+/, /^\s*@\w+/],
  javascript: [/^\s*(?:function|const|let|var|class|import|export)\s+/, /^\s*(?:module\.exports)/],
  typescript: [/^\s*(?:interface|type|enum|namespace)\s+\w+/, /:\s*(?:string|number|boolean|any|void)\b/],
  go: [/^\s*(?:func|type|package|import)\s+/],
  rust: [/^\s*(?:fn|struct|enum|impl|mod|use|pub)\s+/, /^\s*#\[/],
}

const CSV_LINE = /^[^\n,]+\s*(?:,\s*[^\n,]+)+\s*$/

function tryDetectJson(content: string): DetectionResult | null {
  const stripped = content.trim()
  if (!stripped) return null

  let value: unknown
  try {
    value = JSON.parse(stripped)
  } catch {
    if (stripped.startsWith("{")) {
      const items = tryDecodeConcatenatedJson(stripped)
      if (items && items.length >= 2 && items.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
        return { type: "json", confidence: 1.0 }
      }
    }
    const start = findJsonStart(stripped)
    if (start < 0) return null
    try {
      const decoder = new JSONDecoder()
      const [decoded, end] = decoder.decode(stripped, start)
      if (end - start < stripped.length * 0.6) return null
      value = decoded
    } catch {
      return null
    }
  }

  if (typeof value !== "object" || value === null) return null
  if (Array.isArray(value)) {
    const isDictArray = value.length > 0 && value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))
    return { type: "json", confidence: isDictArray ? 1.0 : 0.8 }
  }
  return { type: "json", confidence: 0.9 }
}

function tryDecodeConcatenatedJson(content: string): unknown[] | null {
  const decoder = new JSONDecoder()
  let idx = 0
  const items: unknown[] = []
  while (idx < content.length) {
    while (idx < content.length && /\s/.test(content[idx]!)) idx++
    if (idx >= content.length) break
    try {
      const [value, nextIdx] = decoder.decode(content, idx)
      items.push(value)
      idx = nextIdx
    } catch {
      return null
    }
  }
  return items.length > 0 ? items : null
}

function findJsonStart(content: string): number {
  const braceIdx = content.indexOf("{")
  const bracketIdx = content.indexOf("[")
  if (braceIdx < 0 && bracketIdx < 0) return -1
  if (braceIdx < 0) return bracketIdx
  if (bracketIdx < 0) return braceIdx
  return Math.min(braceIdx, bracketIdx)
}

class JSONDecoder {
  private pos = 0
  private input = ""

  decode(input: string, start: number): [unknown, number] {
    this.input = input
    this.pos = start
    const value = this.parseValue()
    this.skipWhitespace()
    return [value, this.pos]
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) this.pos++
  }

  private peek(): string {
    return this.input[this.pos] ?? ""
  }

  private advance(): string {
    return this.input[this.pos++]!
  }

  private expect(char: string) {
    this.skipWhitespace()
    if (this.advance() !== char) throw new Error(`Expected '${char}'`)
  }

  private parseValue(): unknown {
    this.skipWhitespace()
    const c = this.peek()
    if (c === "{") return this.parseObject()
    if (c === "[") return this.parseArray()
    if (c === '"') return this.parseString()
    if (c === "t" || c === "f") return this.parseBoolean()
    if (c === "n") return this.parseNull()
    return this.parseNumber()
  }

  private parseObject(): Record<string, unknown> {
    this.expect("{")
    const obj: Record<string, unknown> = {}
    this.skipWhitespace()
    if (this.peek() === "}") {
      this.advance()
      return obj
    }
    while (true) {
      this.skipWhitespace()
      const key = this.parseString()
      this.expect(":")
      obj[key] = this.parseValue()
      this.skipWhitespace()
      if (this.peek() === ",") {
        this.advance()
        continue
      }
      break
    }
    this.expect("}")
    return obj
  }

  private parseArray(): unknown[] {
    this.expect("[")
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
    this.expect("]")
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
        switch (esc) {
          case "n": result += "\n"
            break
          case "t": result += "\t"
            break
          case "\\": result += "\\"
            break
          case '"': result += '"'
            break
          default: result += esc
        }
      } else {
        result += c
      }
    }
    return result
  }

  private parseNumber(): number {
    this.skipWhitespace()
    let numStr = ""
    if (this.peek() === "-") numStr += this.advance()
    while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos]!)) numStr += this.advance()
    if (this.peek() === "e" || this.peek() === "E") {
      numStr += this.advance()
      if (this.peek() === "+" || this.peek() === "-") numStr += this.advance()
      while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos]!)) numStr += this.advance()
    }
    return Number(numStr)
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

  private parseNull(): null {
    this.pos += 4
    return null
  }
}

function tryDetectHtml(content: string): DetectionResult | null {
  const sample = content.slice(0, 3000)
  const hasDoctype = HTML_DOCTYPE.test(sample)
  const hasHtmlTag = HTML_TAG.test(sample)
  const hasBody = HTML_BODY.test(sample)
  const structuralMatches = (sample.match(HTML_STRUCTURAL) || []).length

  if (!hasDoctype && !hasHtmlTag && structuralMatches < 3) return null

  let confidence = 0
  if (hasDoctype) confidence += 0.5
  if (hasHtmlTag) confidence += 0.3
  if (hasBody) confidence += 0.1
  confidence += Math.min(0.3, structuralMatches * 0.03)
  confidence = Math.min(1.0, confidence)

  if (confidence < 0.5) return null
  return { type: "html", confidence }
}

function tryDetectSearch(content: string): DetectionResult | null {
  const lines = content.split("\n").slice(0, 100)
  if (!lines.length) return null

  let matchingLines = 0
  for (const line of lines) {
    if (line.trim() && SEARCH_LINE.test(line) && SEARCH_PATH_PREFIX.test(line.split(":")[0]!)) {
      matchingLines++
    }
  }

  if (matchingLines < 2) return null

  const nonEmpty = lines.filter((l) => l.trim()).length
  if (nonEmpty === 0) return null
  const ratio = matchingLines / nonEmpty

  return { type: "search", confidence: Math.min(1.0, 0.5 + ratio * 0.5) }
}

function tryDetectLog(content: string): DetectionResult | null {
  const lines = content.split("\n").slice(0, 200)
  if (!lines.length) return null

  let logLines = 0
  let errorLines = 0
  let stackTraceLines = 0
  let summaryLines = 0

  for (const line of lines) {
    if (LOG_LEVEL.test(line)) logLines++
    if (/\b(?:ERROR|FAIL|FAILED|FATAL|CRITICAL)\b/i.test(line)) errorLines++
    if (LOG_STACK_TRACE.test(line)) stackTraceLines++
    if (LOG_SUMMARY.test(line)) summaryLines++
  }

  const score = (logLines * 0.3 + errorLines * 0.4 + stackTraceLines * 0.5 + summaryLines * 0.4) / lines.length
  if (score < 0.15) return null

  return { type: "log", confidence: Math.min(1.0, 0.4 + score * 2) }
}

function tryDetectConfig(content: string): DetectionResult | null {
  const lines = content.split("\n").slice(0, 100)
  if (!lines.length) return null

  let sectionLines = 0
  let keyValueLines = 0
  let commentLines = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (CONFIG_SECTION.test(trimmed)) sectionLines++
    if (CONFIG_YAML_KEY.test(trimmed)) keyValueLines++
    if (CONFIG_COMMENT.test(trimmed)) commentLines++
  }

  const nonEmpty = lines.filter((l) => l.trim()).length
  if (nonEmpty === 0) return null
  const ratio = (sectionLines + keyValueLines) / nonEmpty
  if (ratio < 0.3) return null

  return { type: "config", confidence: Math.min(1.0, 0.3 + ratio) }
}

function tryDetectCode(content: string): DetectionResult | null {
  const lines = content.split("\n").slice(0, 50)
  if (!lines.length) return null

  for (const [lang, patterns] of Object.entries(CODE_PATTERNS)) {
    let matches = 0
    for (const line of lines) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          matches++
          break
        }
      }
    }
    if (matches >= 2) {
      return { type: "code", confidence: Math.min(1.0, 0.5 + matches * 0.1) }
    }
  }
  return null
}

function tryDetectCsv(content: string): DetectionResult | null {
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 3) return null

  let csvLines = 0
  for (const line of lines) {
    if (CSV_LINE.test(line)) csvLines++
  }

  const ratio = csvLines / lines.length
  if (ratio < 0.8) return null

  return { type: "csv", confidence: Math.min(1.0, 0.5 + ratio * 0.5) }
}

export function detectContentType(content: string): DetectionResult {
  if (!content || !content.trim()) return { type: "text", confidence: 0 }

  const json = tryDetectJson(content)
  if (json) return json

  const html = tryDetectHtml(content)
  if (html) return html

  const search = tryDetectSearch(content)
  if (search) return search

  const log = tryDetectLog(content)
  if (log) return log

  const csv = tryDetectCsv(content)
  if (csv) return csv

  const config = tryDetectConfig(content)
  if (config) return config

  const code = tryDetectCode(content)
  if (code) return code

  return { type: "text", confidence: 0.5 }
}

const COMPRESSORS: Record<ContentType, (content: string, maxChars: number) => string> = {
  json: compressJson,
  log: compressLog,
  search: compressSearch,
  html: extractHtml,
  config: compressConfig,
  code: compressCode,
  csv: compressCsv,
  text: (content) => content,
}

const PRIORITY: ContentType[] = ["json", "log", "search", "html", "config", "code", "csv", "text"]

function isCompressorEnabled(type: ContentType, cfg?: ConfigV1.Info["compression"]): boolean {
  if (!cfg) return true
  if (cfg.enabled === false) return false
  const compressors = cfg.compressors
  if (!compressors) return true
  const key = type === "csv" ? "csv" : type
  const enabled = compressors[key as keyof typeof compressors]
  if (enabled === false) return false
  return true
}

export function compressByType(content: string, maxChars: number, cfg?: ConfigV1.Info["compression"]): string {
  if (!content || content.length <= maxChars) return content

  const detection = detectContentType(content)

  if (detection.type !== "text" && isCompressorEnabled(detection.type, cfg)) {
    const compressor = COMPRESSORS[detection.type]
    const compressed = compressor(content, maxChars)
    if (compressed.length <= maxChars) return compressed
    return compressed.slice(0, maxChars)
  }

  const fallback = content.slice(0, maxChars)
  const omitted = content.length - maxChars
  if (omitted > 0) return fallback + `\n[Tool output truncated for compaction: omitted ${omitted} chars]`
  return fallback
}
