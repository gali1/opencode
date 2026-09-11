type LogLevel = "error" | "fail" | "warn" | "info" | "debug" | "trace" | "unknown"

interface LogLine {
  content: string
  level: LogLevel
  isStackTrace: boolean
  isSummary: boolean
}

const LEVEL_PATTERNS: [LogLevel, RegExp][] = [
  ["error", /\b(?:ERROR|error|Error|FATAL|fatal|Fatal|CRITICAL|critical)\b/],
  ["fail", /\b(?:FAIL|FAILED|fail|failed|Fail|Failed)\b/],
  ["warn", /\b(?:WARN|WARNING|warn|warning|Warn|Warning)\b/],
  ["info", /\b(?:INFO|info|Info)\b/],
  ["debug", /\b(?:DEBUG|debug|Debug)\b/],
  ["trace", /\b(?:TRACE|trace|Trace)\b/],
]

const STACK_TRACE_PATTERNS: RegExp[] = [
  /^\s*Traceback \(most recent call last\)/,
  /^\s*File ".+", line \d+/,
  /^\s*at .+\(.+:\d+:\d+\)/,
  /^\s+at [\w.$]+\(/,
  /^thread '[^']*' panicked at/,
  /^stack backtrace:/,
  /^\s+\d+: \S/,
  /^(?:panic|fatal error): /,
  /^goroutine \d+ \[/,
  /^\t\S+\.go:\d+/,
  /^Unhandled exception\./,
  /^\s*at .+\) in .+:line \d+/,
  /^Caused by: /,
  /^\s*\.\.\. \d+ more$/,
]

const SUMMARY_PATTERNS: RegExp[] = [
  /^={3,}/,
  /^-{3,}/,
  /^\d+ (?:passed|failed|skipped|error|warning)/,
  /^(?:Tests?|Suites?):?\s+\d+/,
  /^(?:TOTAL|Total|Summary)/,
  /^(?:Build|Compile|Test).*(?:succeeded|failed|complete)/,
]

function parseLine(line: string): LogLine {
  let level: LogLevel = "unknown"
  for (const [lvl, pattern] of LEVEL_PATTERNS) {
    if (pattern.test(line)) {
      level = lvl
      break
    }
  }

  let isStackTrace = false
  for (const pattern of STACK_TRACE_PATTERNS) {
    if (pattern.test(line)) {
      isStackTrace = true
      break
    }
  }

  let isSummary = false
  for (const pattern of SUMMARY_PATTERNS) {
    if (pattern.test(line)) {
      isSummary = true
      break
    }
  }

  return { content: line, level, isStackTrace, isSummary }
}

function scoreLine(line: LogLine): number {
  const levelScores: Record<LogLevel, number> = {
    error: 1.0,
    fail: 1.0,
    warn: 0.5,
    info: 0.1,
    debug: 0.05,
    trace: 0.02,
    unknown: 0.1,
  }
  let score = levelScores[line.level] ?? 0.1
  if (line.isStackTrace) score += 0.3
  if (line.isSummary) score += 0.4
  return Math.min(1.0, score)
}

function dedupeSimilarLines(lines: LogLine[]): LogLine[] {
  const seen = new Map<string, number>()
  const result: LogLine[] = []

  for (const line of lines) {
    const normalized = line.content
      .replace(/\d+/g, "N")
      .replace(/\/[\w./-]+/g, "/PATH")
      .replace(/0x[0-9a-f]+/i, "0xHEX")
      .trim()

    const count = seen.get(normalized) ?? 0
    if (count === 0) {
      seen.set(normalized, 1)
      result.push(line)
    } else if (count === 1) {
      seen.set(normalized, 2)
      result.push({ ...line, content: `[repeated ${count + 1}x] ${line.content}` })
    } else {
      seen.set(normalized, count + 1)
    }
  }

  return result
}

export function compressLog(content: string, maxChars: number): string {
  const lines = content.split("\n")
  if (lines.length <= 10) return content

  const parsed = lines.map(parseLine)
  const scored = parsed.map((line) => ({ ...line, score: scoreLine(line) }))

  const errorLines = scored.filter((l) => l.level === "error" || l.level === "fail")
  const warnLines = scored.filter((l) => l.level === "warn")
  const summaryLines = scored.filter((l) => l.isSummary)
  const stackTraceLines = scored.filter((l) => l.isStackTrace)

  const MAX_ERRORS = 10
  const MAX_WARNINGS = 5
  const MAX_STACK_TRACES = 30

  const selected: LogLine[] = []

  for (const line of errorLines.slice(0, MAX_ERRORS)) {
    selected.push(line)
  }
  for (const line of warnLines.slice(0, MAX_WARNINGS)) {
    selected.push(line)
  }
  for (const line of summaryLines) {
    selected.push(line)
  }
  if (stackTraceLines.length > MAX_STACK_TRACES) {
    const kept = stackTraceLines.slice(0, MAX_STACK_TRACES)
    const collapsed = {
      content: `[... ${stackTraceLines.length - MAX_STACK_TRACES} stack frames collapsed]`,
      level: "unknown" as LogLevel,
      isStackTrace: false,
      isSummary: false,
    }
    selected.push(...kept, collapsed)
  } else {
    selected.push(...stackTraceLines)
  }

  const deduped = dedupeSimilarLines(selected)

  const MAX_TOTAL = 100
  let result: string
  if (deduped.length > MAX_TOTAL) {
    const kept = deduped.slice(0, MAX_TOTAL)
    const omitted = deduped.length - MAX_TOTAL
    result = kept.map((l) => l.content).join("\n") + `\n[... ${omitted} lines omitted]`
  } else {
    result = deduped.map((l) => l.content).join("\n")
  }

  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}
