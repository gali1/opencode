import { describe, expect, test } from "bun:test"
import { computeOptimalK } from "../../src/session/compression/adaptiveSizer"
import { compressJson, compressJsonLegacy, parseCsvSchema, renderCsvSchema } from "../../src/session/compression/json"

describe("computeOptimalK", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `item ${i}`, score: 1 - i / 100 }))

  test("fast path keeps every item for n <= 8 and honors maxK", () => {
    expect(computeOptimalK(items(5))).toBe(5)
    expect(computeOptimalK(items(8))).toBe(8)
    expect(computeOptimalK(items(8), { maxK: 3 })).toBe(3)
  })

  test("collapses near-total redundancy to minK", () => {
    const repeated = Array.from({ length: 20 }, () => ({ id: "connection refused by upstream", score: 0.5 }))
    expect(computeOptimalK(repeated, { minK: 5, maxK: 20 })).toBe(5)
  })

  test("finds the coverage-curve knee", () => {
    const list = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: `alpha${i} beta${i}`, score: 1 - i / 100 })),
      ...Array.from({ length: 30 }, () => ({ id: "alpha9 beta9", score: 0.01 })),
    ]
    expect(computeOptimalK(list, { minK: 3, maxK: 10 })).toBe(10)
  })

  test("is deterministic", () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ id: `log entry number ${i} payload`, score: i % 3 }))
    expect(computeOptimalK(list, { minK: 5, maxK: 30 })).toBe(computeOptimalK(list, { minK: 5, maxK: 30 }))
  })
})

describe("compressJson identical-item dedup", () => {
  test("removes duplicate array items when that strictly shrinks the output", () => {
    const input = JSON.stringify([{ a: 1 }, { a: 1 }, { a: 1 }, { a: 2 }])
    const result = compressJson(input, 10000)
    expect(JSON.parse(result)).toEqual([{ a: 1 }, { a: 2 }])
    expect(result.length).toBeLessThan(compressJsonLegacy(input, 10000).length)
  })

  test("leaves arrays without duplicates unchanged in value", () => {
    const input = JSON.stringify([1, 2, 3])
    expect(compressJson(input, 10000)).toBe(input)
  })
})

describe("CSV-schema render", () => {
  test("renders tabular objects and round-trips values", () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      label: i % 5 === 0 ? "" : `label-${i}`,
      note: i % 7 === 0 ? null : `note-${i}`,
      literal: "null",
      text: i % 11 === 0 ? "a,b" : "plain",
      quoted: i % 13 === 0 ? 'say "hi"' : "x",
    }))
    const text = compressJson(JSON.stringify(items), 100000)
    expect(text.startsWith(`[${items.length}]{`)).toBe(true)
    expect(parseCsvSchema(text)).toEqual(items)
  })

  test("disambiguates missing, null, empty and literal null", () => {
    const items = [{ v: 1 }, {}, { v: null }, { v: "" }, { v: "null" }]
    const text = renderCsvSchema(items)
    expect(text).not.toBeNull()
    expect(text).toContain('""')
    expect(text).toContain('"null"')
    expect(parseCsvSchema(text!)).toEqual(items)
  })

  test("declines non-tabular input", () => {
    expect(
      renderCsvSchema([
        [1, 2],
        [3, 4],
      ]),
    ).toBeNull()
    expect(renderCsvSchema([{ a: 1 }])).toBeNull()
  })
})

describe("compressJson truncation retention", () => {
  test("retains first, last, error and anomaly items with an omission marker", () => {
    const items: Record<string, unknown>[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      msg: "ok",
      n: i === 30 ? 1000 : i % 5,
    }))
    items[42] = { id: 42, msg: "error: boom", n: 3 }

    const input = JSON.stringify(items)
    const maxChars = 200
    const legacy = compressJsonLegacy(input, maxChars)
    const result = compressJson(input, maxChars)

    expect(result.length).toBeLessThanOrEqual(maxChars)
    expect(result.length).toBeLessThanOrEqual(legacy.length)
    expect(result).toContain('"id":0')
    expect(result).toContain('"id":59')
    expect(result).toContain('"id":42')
    expect(result).toContain('"id":30')
    expect(result).toMatch(/\.\.\. \d+ items omitted/)
  })
})

describe("compressJson fail-open", () => {
  test("returns malformed content unchanged", () => {
    expect(compressJson("{not json", 100)).toBe("{not json")
    expect(compressJson("[1,2,", 10)).toBe("[1,2,")
    expect(compressJson("", 100)).toBe("")
    expect(compressJson("   ", 100)).toBe("   ")
  })
})

describe("compressJson never grows the legacy output", () => {
  const corpus: Array<{ name: string; input: string; maxChars: number }> = [
    {
      name: "duplicate dicts",
      input: JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ kind: i % 2, value: i % 3 }))),
      maxChars: 120,
    },
    {
      name: "tabular objects",
      input: JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ id: i, name: `user-${i}`, ok: true }))),
      maxChars: 100000,
    },
    {
      name: "error and anomaly retention",
      input: JSON.stringify(
        Array.from({ length: 60 }, (_, i) => ({ id: i, msg: i === 42 ? "fatal error" : "ok", n: i === 30 ? 1000 : i })),
      ),
      maxChars: 200,
    },
    { name: "scalar array", input: JSON.stringify(Array.from({ length: 30 }, (_, i) => i * 7)), maxChars: 50 },
    {
      name: "mixed array",
      input: JSON.stringify([...Array.from({ length: 25 }, (_, i) => ({ id: i })), null, "tail"]),
      maxChars: 100,
    },
    { name: "concatenated objects", input: '{"a":1}\n{"a":2}', maxChars: 10 },
    {
      name: "large object",
      input: JSON.stringify(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]))),
      maxChars: 100,
    },
    {
      name: "deep nesting",
      input: JSON.stringify({ a: { b: { c: Array.from({ length: 40 }, (_, i) => i) } } }),
      maxChars: 100,
    },
    { name: "invalid json", input: "definitely not json", maxChars: 10 },
    { name: "empty array", input: "[]", maxChars: 0 },
    {
      name: "unicode",
      input: JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ t: `日本語テキスト${i}`, id: i }))),
      maxChars: 80,
    },
    { name: "single dict", input: '{"only": true}', maxChars: 5 },
    { name: "single dict array", input: '[{"only": true}]', maxChars: 5 },
    { name: "null array", input: JSON.stringify(Array.from({ length: 25 }, () => null)), maxChars: 100 },
  ]

  test("upgraded output length <= legacy output length for every sample", () => {
    for (const sample of corpus) {
      const legacy = compressJsonLegacy(sample.input, sample.maxChars)
      const upgraded = compressJson(sample.input, sample.maxChars)
      expect(upgraded.length, sample.name).toBeLessThanOrEqual(legacy.length)
    }
  })
})
