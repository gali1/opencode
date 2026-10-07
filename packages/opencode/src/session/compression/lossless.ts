// Format-native lossless folds ported from Headroom's lossless_compaction.py.
//
// Every fold is exactly reversible: the inverse functions are used at runtime
// to verify each candidate, and a fold is adopted only when its output is
// strictly smaller than its input. The model only ever sees the folded side,
// so a fold that fails verification or saves nothing is discarded.
// Nothing here raises: foldLossless is fail-open and returns the original.

const ANSI_SGR_RE = /\x1b\[[0-9;]*m/g

const RUN_MARKER_RE = /^\.\.\. \(repeated (\d+) times\)$/
const BLOCK_MARKER_RE = /^\.\.\. \(repeats (\d+) lines from (\d+) lines back\)$/

const FOLD_MIN_BLOCK = 3
const FOLD_MAX_BLOCK = 64
const FOLD_MAX_CANDIDATES = 8
const FOLD_MAX_LINES = 20_000

// Pure file-path row: optional ./ or ../ root, >=1 directory segment, then a
// basename. No whitespace or ':' so grep path:line:content rows are excluded;
// directory-only lines (trailing '/') don't match (empty basename).
const PATH_ROW_RE = /^((?:\.{0,2}\/)?(?:[^/\s:]+\/)+)([^/\s:]+)$/

function splitKeepTrailing(text: string): { lines: string[]; trailing: boolean } {
  if (text === "") return { lines: [], trailing: false }
  const trailing = text.endsWith("\n")
  return { lines: (trailing ? text.slice(0, -1) : text).split("\n"), trailing }
}

function join(lines: string[], trailing: boolean): string {
  return trailing ? lines.join("\n") + "\n" : lines.join("\n")
}

export function stripAnsi(text: string): string {
  if (typeof text !== "string" || !text.includes("\x1b")) return text
  return text.replace(ANSI_SGR_RE, "")
}

export function collapseRuns(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  if (!lines.length) return text
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    let j = i
    while (j + 1 < lines.length && lines[j + 1] === lines[i]) j++
    const runLength = j - i + 1
    out.push(lines[i]!)
    if (runLength >= 2) out.push(`... (repeated ${runLength} times)`)
    i = j + 1
  }
  return join(out, trailing)
}

export function expandRuns(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  if (!lines.length) return text
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (i + 1 < lines.length) {
      const match = RUN_MARKER_RE.exec(lines[i + 1]!)
      if (match) {
        const count = Number(match[1])
        for (let k = 0; k < count; k++) out.push(line)
        i += 2
        continue
      }
    }
    out.push(line)
    i++
  }
  return join(out, trailing)
}

export function foldRepeatedBlocks(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  const n = lines.length
  if (n < FOLD_MIN_BLOCK * 2 || n > FOLD_MAX_LINES) return text

  const positions = new Map<string, number[]>()
  const remember = (line: string, index: number) => {
    const bucket = positions.get(line)
    if (!bucket) {
      positions.set(line, [index])
      return
    }
    bucket.push(index)
    if (bucket.length > FOLD_MAX_CANDIDATES) bucket.shift()
  }

  const out: string[] = []
  let i = 0
  while (i < n) {
    let bestLength = 0
    let bestDistance = 0
    const candidates = positions.get(lines[i]!)
    if (candidates) {
      for (let c = candidates.length - 1; c >= 0; c--) {
        const q = candidates[c]!
        const maxLength = Math.min(FOLD_MAX_BLOCK, n - i, i - q)
        let length = 0
        while (length < maxLength && lines[q + length] === lines[i + length]) length++
        if (length > bestLength) {
          bestLength = length
          bestDistance = i - q
        }
      }
    }
    if (bestLength >= FOLD_MIN_BLOCK) {
      const marker = `... (repeats ${bestLength} lines from ${bestDistance} lines back)`
      let blockChars = 0
      for (let k = 0; k < bestLength; k++) blockChars += lines[i + k]!.length + 1
      if (blockChars > marker.length + 1) {
        out.push(marker)
        for (let k = 0; k < bestLength; k++) remember(lines[i + k]!, i + k)
        i += bestLength
        continue
      }
    }
    remember(lines[i]!, i)
    out.push(lines[i]!)
    i++
  }
  return join(out, trailing)
}

export function unfoldRepeatedBlocks(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  if (!lines.length) return text
  const out: string[] = []
  for (const line of lines) {
    const match = BLOCK_MARKER_RE.exec(line)
    if (match) {
      const length = Number(match[1])
      const distance = Number(match[2])
      const start = out.length - distance
      if (start >= 0 && length <= distance) {
        for (let k = 0; k < length; k++) out.push(out[start + k]!)
        continue
      }
    }
    out.push(line)
  }
  return join(out, trailing)
}

export function foldPathListing(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  let pathRows = 0
  for (const line of lines) if (PATH_ROW_RE.test(line)) pathRows++
  if (pathRows < 2) return text

  const out: string[] = []
  let current: string | null = null
  for (const line of lines) {
    const match = PATH_ROW_RE.exec(line)
    if (match) {
      const dir = match[1]!
      if (dir !== current) {
        out.push(dir)
        current = dir
      }
      out.push(match[2]!)
    } else {
      out.push(line)
      current = null
    }
  }
  return join(out, trailing)
}

export function unfoldPathListing(text: string): string {
  if (typeof text !== "string" || text === "") return text
  const { lines, trailing } = splitKeepTrailing(text)
  if (!lines.length) return text
  const out: string[] = []
  let current: string | null = null
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const isBasename = line !== "" && !line.includes("/")
    if (current !== null && isBasename) {
      out.push(current + line)
      i++
      continue
    }
    if (line.endsWith("/") && i + 1 < lines.length && lines[i + 1] !== "" && !lines[i + 1]!.includes("/")) {
      current = line
      i++
      continue
    }
    current = null
    out.push(line)
    i++
  }
  return join(out, trailing)
}

// Applies ANSI stripping and every fold in sequence. Each candidate is
// verified by running its exact inverse and adopted only when the round-trip
// reproduces the input and the candidate is strictly smaller. Fail-open:
// malformed input or an internal error returns the original unchanged.
export function foldLossless(text: string): string {
  if (typeof text !== "string" || text === "") return text
  try {
    let current = text

    const stripped = stripAnsi(current)
    if (stripped.length < current.length) current = stripped

    const collapsed = collapseRuns(current)
    if (collapsed.length < current.length && expandRuns(collapsed) === current) current = collapsed

    const folded = foldRepeatedBlocks(current)
    if (folded.length < current.length && unfoldRepeatedBlocks(folded) === current) current = folded

    const paths = foldPathListing(current)
    if (paths.length < current.length && unfoldPathListing(paths) === current) current = paths

    return current
  } catch {
    return text
  }
}
