import { describe, expect, test } from "bun:test"
import {
  CRITICAL_LINE_RE,
  MUST_KEEP_RE,
  collapseRuns,
  compressByType,
  elideDenseLines,
  expandRuns,
  foldLossless,
  foldPathListing,
  foldRepeatedBlocks,
  isCriticalLine,
  stripAnsi,
  unfoldPathListing,
  unfoldRepeatedBlocks,
} from "../../src/session/compression/index"

const REPEATED_LINE = "connection refused by upstream service"

const dense = (length: number) =>
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    .repeat(Math.ceil(length / 64))
    .slice(0, length)

describe("protection", () => {
  test("isCriticalLine flags failure signals", () => {
    for (const line of [
      "2026-01-01 ERROR request failed",
      "FATAL: cannot continue",
      "CRITICAL disk full",
      "Traceback (most recent call last):",
      "thread 'main' panicked at src/main.rs:1",
      "Unhandled exception occurred",
      "AssertionError: expected 1",
    ]) {
      expect(isCriticalLine(line)).toBe(true)
    }
  })

  test("isCriticalLine ignores ordinary lines and empty input", () => {
    expect(isCriticalLine("2026-01-01 INFO request completed")).toBe(false)
    expect(isCriticalLine("")).toBe(false)
  })

  test("exports both protection regexes", () => {
    expect(CRITICAL_LINE_RE).toBeInstanceOf(RegExp)
    expect(MUST_KEEP_RE).toBeInstanceOf(RegExp)
  })

  test("MUST_KEEP_RE protects fragile tokens", () => {
    expect(MUST_KEEP_RE.test("0x7fff2038")).toBe(true)
    expect(MUST_KEEP_RE.test("--verbose")).toBe(true)
    expect(MUST_KEEP_RE.test("IndexError")).toBe(true)
    expect(MUST_KEEP_RE.test("do not guess")).toBe(true)
    expect(MUST_KEEP_RE.test("plainprose")).toBe(false)
  })
})

describe("stripAnsi", () => {
  test("removes SGR color codes", () => {
    expect(stripAnsi("\x1b[31mERROR\x1b[0m connection failed")).toBe("ERROR connection failed")
  })

  test("leaves plain text unchanged", () => {
    const text = "no escapes here"
    expect(stripAnsi(text)).toBe(text)
  })

  test("is deterministic", () => {
    const text = "\x1b[1m\x1b[32mok\x1b[0m"
    expect(stripAnsi(text)).toBe(stripAnsi(text))
  })
})

describe("collapseRuns", () => {
  test("collapses a run of identical lines with a count marker", () => {
    expect(collapseRuns("boom\nboom\nboom\nok")).toBe("boom\n... (repeated 3 times)\nok")
  })

  test("round-trips through expandRuns", () => {
    const text = "alpha\nbeta\nbeta\ngamma\ngamma\ngamma\ndelta"
    expect(expandRuns(collapseRuns(text))).toBe(text)
  })

  test("leaves unique lines unchanged", () => {
    const text = "a\nb\nc"
    expect(collapseRuns(text)).toBe(text)
  })

  test("preserves a trailing newline", () => {
    expect(collapseRuns("x\nx\n")).toBe("x\n... (repeated 2 times)\n")
  })

  test("is deterministic", () => {
    const text = "a\na\na\nb"
    expect(collapseRuns(text)).toBe(collapseRuns(text))
  })
})

describe("foldRepeatedBlocks", () => {
  const longLine = (n: number) => `frame ${n} ${"x".repeat(40)}`
  const block = [longLine(1), longLine(2), longLine(3)]
  const text = [...block, "between a", "between b", "between c", ...block].join("\n")

  test("folds a repeated block into a back-reference", () => {
    const folded = foldRepeatedBlocks(text)
    expect(folded).toContain("... (repeats 3 lines from 6 lines back)")
    expect(folded.length).toBeLessThan(text.length)
  })

  test("round-trips through unfoldRepeatedBlocks", () => {
    expect(unfoldRepeatedBlocks(foldRepeatedBlocks(text))).toBe(text)
  })

  test("leaves non-repeating content unchanged", () => {
    const unique = ["a".repeat(50), "b".repeat(50), "c".repeat(50), "d".repeat(50), "e".repeat(50), "f".repeat(50)].join(
      "\n",
    )
    expect(foldRepeatedBlocks(unique)).toBe(unique)
  })

  test("is deterministic", () => {
    expect(foldRepeatedBlocks(text)).toBe(foldRepeatedBlocks(text))
  })
})

describe("foldPathListing", () => {
  const text = "src/a.ts\nsrc/b.ts\nsrc/c.ts"

  test("groups consecutive same-directory paths under a heading", () => {
    const folded = foldPathListing(text)
    expect(folded).toBe("src/\na.ts\nb.ts\nc.ts")
    expect(folded.length).toBeLessThan(text.length)
  })

  test("round-trips through unfoldPathListing", () => {
    expect(unfoldPathListing(foldPathListing(text))).toBe(text)
  })

  test("leaves a single path unchanged", () => {
    expect(foldPathListing("src/a.ts")).toBe("src/a.ts")
  })

  test("leaves prose unchanged", () => {
    const prose = "the quick brown fox\njumps over the lazy dog"
    expect(foldPathListing(prose)).toBe(prose)
  })

  test("is deterministic", () => {
    expect(foldPathListing(text)).toBe(foldPathListing(text))
  })
})

describe("foldLossless", () => {
  test("strips ANSI and collapses runs of long lines", () => {
    const text = [`\x1b[32m${REPEATED_LINE}\x1b[0m`, `\x1b[32m${REPEATED_LINE}\x1b[0m`, `\x1b[32m${REPEATED_LINE}\x1b[0m`].join(
      "\n",
    )
    const folded = foldLossless(text)
    expect(folded).toBe(`${REPEATED_LINE}\n... (repeated 3 times)`)
    expect(folded.length).toBeLessThan(text.length)
  })

  test("folds path listings", () => {
    const text = "packages/core/src/a.ts\npackages/core/src/b.ts\npackages/core/src/c.ts"
    expect(foldLossless(text)).toBe("packages/core/src/\na.ts\nb.ts\nc.ts")
  })

  test("returns non-repeating content unchanged", () => {
    const text = "unique line one\nunique line two\nunique line three"
    expect(foldLossless(text)).toBe(text)
  })

  test("is deterministic", () => {
    const text = [REPEATED_LINE, REPEATED_LINE, "src/a.ts", "src/b.ts"].join("\n")
    expect(foldLossless(text)).toBe(foldLossless(text))
  })

  test("fails open on malformed input", () => {
    expect(foldLossless(null as unknown as string)).toBe(null as unknown as string)
    expect(foldLossless(undefined as unknown as string)).toBe(undefined as unknown as string)
  })
})

describe("elideDenseLines", () => {
  const denseBlock = () => Array.from({ length: 6 }, () => dense(400)).join("\n")

  test("elides long dense lines and embeds the retrieval hint", () => {
    const text = denseBlock()
    const result = elideDenseLines(text, { retrievalHint: "session/part-1" })
    expect(result.elided).toBe(6)
    expect(result.text.length).toBeLessThan(text.length)
    expect(result.text).toContain("...[elided")
    expect(result.text).toContain("(retrieve: session/part-1)")
  })

  test("leaves text unchanged when no retrieval hint is provided", () => {
    const text = denseBlock()
    expect(elideDenseLines(text)).toEqual({ text, elided: 0 })
  })

  test("skips lines below the length threshold", () => {
    const text = [dense(250), ...Array.from({ length: 6 }, () => dense(400))].join("\n")
    const result = elideDenseLines(text, { retrievalHint: "h" })
    expect(result.elided).toBe(6)
    expect(result.text.split("\n")[0]).toBe(dense(250))
  })

  test("skips spaced lines", () => {
    const spaced = "word ".repeat(80).trim()
    const text = [spaced, ...Array.from({ length: 6 }, () => dense(400))].join("\n")
    const result = elideDenseLines(text, { retrievalHint: "h" })
    expect(result.elided).toBe(6)
    expect(result.text.split("\n")[0]).toBe(spaced)
  })

  test("skips tab-containing lines", () => {
    const tabbed = dense(200) + "\t" + dense(200)
    const text = [tabbed, ...Array.from({ length: 6 }, () => dense(400))].join("\n")
    const result = elideDenseLines(text, { retrievalHint: "h" })
    expect(result.elided).toBe(6)
    expect(result.text.split("\n")[0]).toBe(tabbed)
  })

  test("skips JSON-shaped lines", () => {
    const jsonLine = `{"payload":"${dense(400)}"}`
    const text = [jsonLine, ...Array.from({ length: 6 }, () => dense(400))].join("\n")
    const result = elideDenseLines(text, { retrievalHint: "h" })
    expect(result.elided).toBe(6)
    expect(result.text.split("\n")[0]).toBe(jsonLine)
  })

  test("skips critical lines", () => {
    const critical = dense(200) + " ERROR " + dense(200)
    const text = [critical, ...Array.from({ length: 6 }, () => dense(400))].join("\n")
    const result = elideDenseLines(text, { retrievalHint: "h" })
    expect(result.elided).toBe(6)
    expect(result.text.split("\n")[0]).toBe(critical)
  })

  test("requires the dense block to reach the minimum total", () => {
    const text = dense(1000)
    expect(elideDenseLines(text, { retrievalHint: "h" })).toEqual({ text, elided: 0 })
  })

  test("does not modify text when elision would not save bytes", () => {
    const text = dense(260)
    const result = elideDenseLines(text, { retrievalHint: "h", minLineChars: 5, minDenseTotalChars: 1, headChars: 120, tailChars: 120 })
    expect(result).toEqual({ text, elided: 0 })
  })

  test("is deterministic", () => {
    const text = denseBlock()
    expect(elideDenseLines(text, { retrievalHint: "h" })).toEqual(elideDenseLines(text, { retrievalHint: "h" }))
  })

  test("fails open on malformed input", () => {
    expect(elideDenseLines(null as unknown as string, { retrievalHint: "h" })).toEqual({
      text: null as unknown as string,
      elided: 0,
    })
  })
})

describe("compressByType with lossless folds", () => {
  const frame = (n: number) => `frame ${n} assertion ${"x".repeat(50)}`
  const lines = [
    frame(0),
    frame(1),
    frame(2),
    "between one",
    frame(0),
    frame(1),
    frame(2),
    "between two",
    frame(0),
    frame(1),
    frame(2),
    "between three",
    frame(0),
    frame(1),
    frame(2),
    "between four",
  ]
  const content = lines.join("\n")
  const maxChars = lines.slice(0, 12).join("\n").length
  const oldOutput = content.slice(0, maxChars) + `\n[Tool output truncated for compaction: omitted ${content.length - maxChars} chars]`

  test("applies folds by default and never grows the old output", () => {
    const result = compressByType(content, maxChars)
    expect(result.length).toBeLessThanOrEqual(oldOutput.length)
    expect(result).toContain("... (repeats 3 lines from 4 lines back)")
    expect(result).toContain("assertion")
  })

  test("lossless: false is byte-identical to the previous behavior", () => {
    expect(compressByType(content, maxChars, { lossless: false })).toBe(oldOutput)
  })

  test("enabled: false disables folds", () => {
    expect(compressByType(content, maxChars, { enabled: false })).toBe(oldOutput)
  })

  test("folded output preserves information when unfolded", () => {
    const result = compressByType(content, maxChars)
    expect(unfoldRepeatedBlocks(result)).toBe(oldOutput)
  })
})

describe("compressByType dense-line elision gating", () => {
  const content = dense(6400) + "\nshort trailing line"
  const maxChars = 3000

  test("is off by default and without a retrieval hint", () => {
    const plain = compressByType(content, maxChars)
    expect(plain).not.toContain("[elided")
    const hinted = compressByType(content, maxChars, { dense_line_elision: true })
    expect(hinted).not.toContain("[elided")
    expect(hinted).toBe(plain)
  })

  test("fires only with dense_line_elision: true and a retrieval hint", () => {
    const off = compressByType(content, maxChars, { dense_line_elision: false }, { retrievalHint: "part-42" })
    expect(off).not.toContain("[elided")
    const on = compressByType(content, maxChars, { dense_line_elision: true }, { retrievalHint: "part-42" })
    expect(on).toContain("[elided")
    expect(on).toContain("(retrieve: part-42)")
    expect(on.length).toBeLessThan(off.length)
  })
})
