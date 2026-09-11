function detectDelimiter(lines: string[]): "," | "\t" | "|" | null {
  const counts = [",", "\t", "|"] as const
  const scores = new Map<string, number>()

  for (const delim of counts) {
    let consistent = true
    let prevCount = -1

    for (const line of lines.slice(0, 20)) {
      if (!line.trim()) continue
      const count = line.split(delim).length - 1
      if (prevCount >= 0 && count !== prevCount && prevCount > 0) {
        consistent = false
        break
      }
      prevCount = count
    }

    if (consistent && prevCount > 0) {
      scores.set(delim, prevCount)
    }
  }

  if (scores.size === 0) return null

  let best = ","
  let bestScore = 0
  for (const [delim, score] of scores) {
    if (score > bestScore) {
      bestScore = score
      best = delim
    }
  }
  return best as "," | "\t" | "|"
}

function isMarkdownTable(lines: string[]): boolean {
  if (lines.length < 2) return false

  const hasPipe = lines.some((l) => l.includes("|"))
  if (!hasPipe) return false

  const separatorLine = lines[1]!
  const cells = separatorLine.split("|").filter((c) => c.trim())
  return cells.every((c) => /^:?-{2,}:?$/.test(c.trim()))
}

function parseRow(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim())
}

function truncateCell(cell: string, maxLen: number): string {
  if (cell.length <= maxLen) return cell
  return cell.slice(0, maxLen - 3) + "..."
}

function formatCompactTable(headers: string[], rows: string[][], maxChars: number): string {
  const maxCellLen = 30
  const maxDisplayRows = 10

  const truncatedHeaders = headers.map((h) => truncateCell(h, maxCellLen))
  const truncatedRows = rows
    .slice(0, maxDisplayRows)
    .map((row) => row.map((cell) => truncateCell(cell, maxCellLen)))

  const widths = truncatedHeaders.map((h, i) =>
    Math.max(h.length, ...truncatedRows.map((r) => (r[i] ?? "").length)),
  )

  const formatRow = (row: string[]) =>
    row.map((cell, i) => cell.padEnd(widths[i]!)).join(" | ")

  const parts: string[] = []
  parts.push(formatRow(truncatedHeaders))
  parts.push(widths.map((w) => "-".repeat(w)).join(" | "))
  parts.push(...truncatedRows.map(formatRow))

  if (rows.length > maxDisplayRows) {
    parts.push(`... ${rows.length - maxDisplayRows} more rows`)
  }

  return parts.join("\n")
}

function formatCsvCompact(headers: string[], rows: string[][], maxChars: number): string {
  const maxDisplayRows = 15
  const truncatedRows = rows.slice(0, maxDisplayRows)

  const parts: string[] = [headers.join(",")]
  parts.push(...truncatedRows.map((row) => row.join(",")))

  if (rows.length > maxDisplayRows) {
    parts.push(`... ${rows.length - maxDisplayRows} more rows`)
  }

  return parts.join("\n")
}

export function compressCsv(content: string, maxChars: number): string {
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 3) return content

  if (isMarkdownTable(lines)) {
    const headers = parseRow(lines[0]!, "|")
    const rows = lines.slice(2).map((line) => parseRow(line, "|"))
    const result = formatCompactTable(headers, rows, maxChars)
    if (result.length <= maxChars) return result
    return result.slice(0, maxChars)
  }

  const delimiter = detectDelimiter(lines)
  if (!delimiter) return content

  const headers = parseRow(lines[0]!, delimiter)
  if (headers.length < 2) return content

  const rows = lines.slice(1).map((line) => parseRow(line, delimiter))

  const consistentRows = rows.every((row) => row.length === headers.length)
  if (!consistentRows) return content

  const result = formatCsvCompact(headers, rows, maxChars)
  if (result.length >= content.length) return content

  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}
