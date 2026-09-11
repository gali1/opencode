const SINGLE_LINE_COMMENT = /\/\/.*$/
const MULTI_LINE_COMMENT_START = /\/\*/
const MULTI_LINE_COMMENT_END = /\*\//
const PYTHON_COMMENT = /#.*$/
const BLOCK_DOCSTRING = /^\s*"""[\s\S]*?"""/gm
const BLOCK_COMMENT = /^\s*\/\*[\s\S]*?\*\//gm

interface ImportBlock {
  start: number
  end: number
  lines: string[]
}

function detectLanguage(lines: string[]): "python" | "javascript" | "typescript" | "go" | "rust" | "unknown" {
  for (const line of lines.slice(0, 30)) {
    if (/^\s*(?:def|class|import|from|async def)\s+/.test(line)) return "python"
    if (/^\s*(?:function|const|let|var|class|import|export)\s+/.test(line)) return "javascript"
    if (/^\s*(?:interface|type|enum|namespace)\s+\w+/.test(line)) return "typescript"
    if (/^\s*(?:func|type|package|import)\s+/.test(line)) return "go"
    if (/^\s*(?:fn|struct|enum|impl|mod|use|pub)\s+/.test(line)) return "rust"
  }
  return "unknown"
}

function collapseImportBlock(lines: string[], lang: string): string[] {
  const result: string[] = []
  let inImportBlock = false
  let importLines: string[] = []
  let blockStart = 0

  const importPattern = getImportPattern(lang)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*")) {
      if (inImportBlock && importLines.length > 1) {
        result.push(`[... ${importLines.length} import statements]`)
        inImportBlock = false
        importLines = []
      }
      result.push(line)
      continue
    }

    if (importPattern.test(trimmed)) {
      if (!inImportBlock) {
        inImportBlock = true
        blockStart = i
        importLines = []
      }
      importLines.push(line)
      continue
    }

    if (inImportBlock) {
      if (importLines.length > 1) {
        const first = importLines[0]!
        const last = importLines[importLines.length - 1]!
        result.push(first)
        result.push(`[... ${importLines.length - 2} import statements]`)
        result.push(last)
      } else {
        result.push(...importLines)
      }
      inImportBlock = false
      importLines = []
    }

    result.push(line)
  }

  if (inImportBlock && importLines.length > 1) {
    result.push(`[... ${importLines.length} import statements]`)
  }

  return result
}

function getImportPattern(lang: string): RegExp {
  switch (lang) {
    case "python":
      return /^\s*(?:import|from)\s+/
    case "javascript":
    case "typescript":
      return /^\s*(?:import\s+|export\s+.*from\s+|const\s+\w+\s*=\s*require\s*\()/
    case "go":
      return /^\s*(?:import\s+|"\w)/
    case "rust":
      return /^\s*(?:use\s+)/
    default:
      return /^\s*(?:import|from|use)\s+/
  }
}

function removeBlankLineRuns(lines: string[]): string[] {
  const result: string[] = []
  let consecutiveBlanks = 0

  for (const line of lines) {
    if (line.trim() === "") {
      consecutiveBlanks++
      if (consecutiveBlanks <= 1) result.push(line)
    } else {
      consecutiveBlanks = 0
      result.push(line)
    }
  }

  return result
}

function removeComments(lines: string[], lang: string): string[] {
  const result: string[] = []
  let inBlockComment = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (inBlockComment) {
      if (trimmed.includes("*/")) {
        inBlockComment = false
      }
      continue
    }

    if (lang === "python") {
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        if (trimmed.slice(3).includes(trimmed.slice(0, 3))) continue
        inBlockComment = true
        continue
      }
      if (trimmed.startsWith("#")) continue
    } else {
      if (trimmed.startsWith("/*")) {
        if (trimmed.includes("*/")) continue
        inBlockComment = true
        continue
      }
      if (trimmed.startsWith("//")) continue
    }

    result.push(line)
  }

  return result
}

export function compressCode(content: string, maxChars: number): string {
  const lines = content.split("\n")
  if (lines.length < 5) return content

  const lang = detectLanguage(lines)
  if (lang === "unknown") return content

  let result = lines
  result = removeComments(result, lang)
  result = collapseImportBlock(result, lang)
  result = removeBlankLineRuns(result)

  const output = result.join("\n")
  if (output.length >= content.length) return content

  if (output.length <= maxChars) return output
  return output.slice(0, maxChars)
}
