const CONFIG_SECTION = /^\s*\[\[?[\w.\-"' ]+\]\]?\s*$/
const CONFIG_YAML_KEY = /^\s*(?:-\s+)?(?:[\w.\-/]+|"[^"]+"|'[^']+')\s*:(?:\s|$)/
const CONFIG_COMMENT = /^\s*[#;]/
const CONFIG_YAML_DOC = /^---\s*$|^\.\.\.\s*$/

function detectConfigFlavor(lines: string[]): "yaml" | "toml" | "ini" | "unknown" {
  let yamlScore = 0
  let tomlScore = 0
  let iniScore = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (CONFIG_SECTION.test(trimmed)) {
      tomlScore += 2
      iniScore += 1
    }
    if (/^\s*[\w.\-]+\s*=\s*\S/.test(trimmed)) tomlScore += 2
    if (/^\s*[\w.\-@ ]+?\s*[=:]\s*/.test(trimmed)) iniScore += 1
    if (CONFIG_YAML_KEY.test(trimmed)) yamlScore += 1
    if (CONFIG_YAML_DOC.test(trimmed)) yamlScore += 3
    if (/^\s*-\s+\S/.test(trimmed)) yamlScore += 1
  }

  const max = Math.max(yamlScore, tomlScore, iniScore)
  if (max === 0) return "unknown"
  if (yamlScore === max) return "yaml"
  if (tomlScore === max) return "toml"
  return "ini"
}

function stripComments(lines: string[], flavor: "yaml" | "toml" | "ini" | "unknown"): string[] {
  const result: string[] = []
  let inBlockScalar = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (flavor === "yaml") {
      if (trimmed.endsWith("|") || trimmed.endsWith(">")) {
        inBlockScalar = true
        result.push(line)
        continue
      }
      if (inBlockScalar) {
        if (/^\s+/.test(line) || trimmed === "") {
          result.push(line)
          continue
        }
        inBlockScalar = false
      }
    }

    if (flavor === "ini") {
      if (/^[#;]/.test(trimmed)) continue
    } else {
      if (/^\s*#/.test(trimmed)) continue
    }

    result.push(line)
  }

  return result
}

function collapseBlankRuns(lines: string[]): string[] {
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

function collapseRepeatedStanzas(lines: string[]): string[] {
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    if (CONFIG_SECTION.test(lines[i]!.trim())) {
      const stanza: string[] = []
      while (i < lines.length && !CONFIG_SECTION.test(lines[i]!.trim())) {
        stanza.push(lines[i]!)
        i++
      }

      let repeatCount = 0
      const stanzaStr = stanza.join("\n")
      let j = i
      while (j < lines.length) {
        const nextStanza: string[] = []
        let k = j
        while (k < lines.length && !CONFIG_SECTION.test(lines[k]!.trim())) {
          nextStanza.push(lines[k]!)
          k++
        }
        if (nextStanza.join("\n") === stanzaStr) {
          repeatCount++
          j = k
        } else {
          break
        }
      }

      result.push(...stanza)
      if (repeatCount > 0) {
        result.push(`# ... ${repeatCount + 1} identical stanzas`)
      }
      i = j
    } else {
      result.push(lines[i]!)
      i++
    }
  }

  return result
}

export function compressConfig(content: string, maxChars: number): string {
  const lines = content.split("\n")
  if (lines.length < 5) return content

  const flavor = detectConfigFlavor(lines)
  if (flavor === "unknown") return content

  let compressed = stripComments(lines, flavor)
  compressed = collapseBlankRuns(compressed)
  compressed = collapseRepeatedStanzas(compressed)

  const result = compressed.join("\n")
  if (result.length >= content.length) return content

  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}
