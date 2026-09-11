interface SearchMatch {
  file: string
  lineNumber: number
  content: string
  score: number
}

interface FileMatches {
  file: string
  matches: SearchMatch[]
}

const SEARCH_RESULT_PATTERN = /^[^\s:]+:\d+:/
const PATH_PREFIX = /^[^\s<>="]+/

function parseSearchResults(content: string): Map<string, FileMatches> {
  const fileMatches = new Map<string, FileMatches>()
  const lines = content.split("\n")

  for (const line of lines) {
    if (!line.trim()) continue
    if (!SEARCH_RESULT_PATTERN.test(line)) continue

    const prefix = line.split(":")[0]!
    if (!PATH_PREFIX.test(prefix)) continue
    if (prefix.includes("<") || prefix.includes(">") || prefix.includes("=")) continue

    const colonIdx = prefix.length
    const rest = line.slice(colonIdx + 1)
    const secondColon = rest.indexOf(":")
    if (secondColon < 0) continue

    const lineNo = parseInt(rest.slice(0, secondColon), 10)
    if (isNaN(lineNo)) continue

    const fileContent = rest.slice(secondColon + 1)

    const filePath = prefix
    if (!fileMatches.has(filePath)) {
      fileMatches.set(filePath, { file: filePath, matches: [] })
    }
    fileMatches.get(filePath)!.matches.push({
      file: filePath,
      lineNumber: lineNo,
      content: fileContent,
      score: 0,
    })
  }

  return fileMatches
}

function scoreMatch(match: SearchMatch, contextWords: Set<string>): number {
  let score = 0
  const contentLower = match.content.toLowerCase()

  for (const word of contextWords) {
    if (contentLower.includes(word)) score += 0.3
  }

  if (/\b(?:error|warning|exception|failed|undefined|null|TypeError|ReferenceError)\b/i.test(match.content)) {
    score += 0.5
  }

  return Math.min(1.0, score)
}

const MAX_MATCHES_PER_FILE = 5
const MAX_TOTAL_MATCHES = 30
const MAX_FILES = 15

function selectMatches(fileMatches: Map<string, FileMatches>): FileMatches[] {
  const sortedFiles = [...fileMatches.values()].sort((a, b) => {
    const aScore = a.matches.reduce((sum, m) => sum + m.score, 0)
    const bScore = b.matches.reduce((sum, m) => sum + m.score, 0)
    return bScore - aScore
  }).slice(0, MAX_FILES)

  const result: FileMatches[] = []
  let totalSelected = 0

  for (const fm of sortedFiles) {
    if (totalSelected >= MAX_TOTAL_MATCHES) break

    const sorted = [...fm.matches].sort((a, b) => b.score - a.score)
    const remainingSlots = Math.min(MAX_MATCHES_PER_FILE, MAX_TOTAL_MATCHES - totalSelected)

    const selected: SearchMatch[] = []
    if (sorted.length > 0) selected.push(sorted[0]!)
    if (sorted.length > 1 && remainingSlots > 1) selected.push(sorted[sorted.length - 1]!)

    for (const match of sorted) {
      if (selected.length >= remainingSlots) break
      if (!selected.some((s) => s.lineNumber === match.lineNumber)) {
        selected.push(match)
      }
    }

    result.push({ file: fm.file, matches: selected.sort((a, b) => a.lineNumber - b.lineNumber) })
    totalSelected += selected.length
  }

  return result
}

function formatGroupedOutput(fileMatches: FileMatches[]): string {
  const parts: string[] = []
  for (const fm of fileMatches) {
    parts.push(`\n${fm.file}`)
    for (const match of fm.matches) {
      parts.push(`  ${match.lineNumber}:${match.content}`)
    }
  }
  return parts.join("\n")
}

export function compressSearch(content: string, maxChars: number): string {
  const fileMatches = parseSearchResults(content)
  if (fileMatches.size === 0) return content

  const totalMatches = [...fileMatches.values()].reduce((sum, fm) => sum + fm.matches.length, 0)
  if (totalMatches < 3) return content

  const selected = selectMatches(fileMatches)
  const result = formatGroupedOutput(selected)

  if (result.length >= content.length) return content

  const omitted = totalMatches - selected.reduce((sum, fm) => sum + fm.matches.length, 0)
  const omittedFiles = fileMatches.size - selected.length

  let output = result
  if (omitted > 0 || omittedFiles > 0) {
    const omittedSummary = []
    if (omitted > 0) omittedSummary.push(`${omitted} matches`)
    if (omittedFiles > 0) omittedSummary.push(`${omittedFiles} files`)
    output += `\n[... ${omittedSummary.join(", ")} omitted]`
  }

  if (output.length <= maxChars) return output
  return output.slice(0, maxChars)
}
