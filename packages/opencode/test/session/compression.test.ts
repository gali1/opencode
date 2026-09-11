import { describe, expect, test } from "bun:test"
import { detectContentType, compressByType } from "../../src/session/compression/router"
import type { ContentType } from "../../src/session/compression/router"

describe("detectContentType", () => {
  test("returns text with 0 confidence for empty/whitespace content", () => {
    expect(detectContentType("")).toEqual({ type: "text", confidence: 0 })
    expect(detectContentType("   ")).toEqual({ type: "text", confidence: 0 })
  })

  test("detects JSON objects", () => {
    const r = detectContentType('{"a": 1, "b": 2}')
    expect(r.type).toBe("json")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects JSON arrays of objects", () => {
    const r = detectContentType('[{"id": 1}, {"id": 2}]')
    expect(r.type).toBe("json")
    expect(r.confidence).toBe(1.0)
  })

  test("detects concatenated JSON", () => {
    const r = detectContentType('{"a":1}\n{"b":2}')
    expect(r.type).toBe("json")
    expect(r.confidence).toBe(1.0)
  })

  test("detects HTML content", () => {
    const r = detectContentType("<!doctype html><html><head></head><body><p>Hello</p></body></html>")
    expect(r.type).toBe("html")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects grep-style search results", () => {
    const content = `src/main.ts:10:const x = 1\nsrc/main.ts:20:const y = 2`
    const r = detectContentType(content)
    expect(r.type).toBe("search")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects log output", () => {
    const content = `2024-01-01 INFO Starting server\n2024-01-01 ERROR Connection failed\n2024-01-01 INFO Retrying`
    const r = detectContentType(content)
    expect(r.type).toBe("log")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects test summary logs", () => {
    const content = `--- a/test.ts\n+++ b/test.ts\n@@ -1,5 +1,5 @@\n36 passed\n0 failed`
    const r = detectContentType(content)
    expect(r.type).toBe("log")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects INI/toml config", () => {
    const content = `[server]\nhost = "localhost"\nport = 8080\n\n[database]\ndriver = "postgres"`
    const r = detectContentType(content)
    expect(r.type).toBe("config")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects YAML config", () => {
    const content = `server:\n  host: localhost\n  port: 8080\ndatabase:\n  driver: postgres`
    const r = detectContentType(content)
    expect(r.type).toBe("config")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects Python code", () => {
    const content = `def hello():\n    print("hello")\n\nclass Foo:\n    pass`
    const r = detectContentType(content)
    expect(r.type).toBe("code")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects TypeScript code", () => {
    const content = `export function hello(name: string): void {\n  const x = name.length\n  return\n}`
    const r = detectContentType(content)
    expect(r.type).toBe("code")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("detects CSV", () => {
    const content = `name,age,city\nAlice,30,NYC\nBob,25,LA`
    const r = detectContentType(content)
    expect(r.type).toBe("csv")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  test("falls back to text for plain prose", () => {
    const content = "This is a normal paragraph of text with no special structure."
    const r = detectContentType(content)
    expect(r.type).toBe("text")
  })
})

describe("compressByType", () => {
  test("returns content unchanged when under maxChars", () => {
    const content = '{"a": 1}'
    expect(compressByType(content, 1000)).toBe(content)
  })

  test("returns content unchanged when empty", () => {
    expect(compressByType("", 100)).toBe("")
  })

  test("compresses JSON objects by summarizing keys", () => {
    const content = JSON.stringify({ name: "Alice", age: 30, email: "alice@example.com", address: "123 Main St" })
    const result = compressByType(content, 50)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.length).toBeGreaterThan(0)
  })

  test("compresses JSON arrays by summarizing", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i, value: `item-${i}` }))
    const content = JSON.stringify(items)
    const result = compressByType(content, 100)
    expect(result.length).toBeLessThanOrEqual(100)
  })

  test("compresses log output by keeping errors and summaries", () => {
    const lines = Array.from({ length: 50 }, (_, i) => {
      if (i % 10 === 0) return `2024-01-01 ERROR failure at line ${i}`
      if (i % 15 === 0) return `2024-01-01 WARN potential issue at line ${i}`
      return `2024-01-01 DEBUG verbose trace at line ${i}`
    })
    const content = lines.join("\n")
    const result = compressByType(content, 200)
    expect(result.length).toBeLessThanOrEqual(200)
    expect(result).toContain("ERROR")
  })

  test("compresses search results by picking top matches", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `src/file${i}.ts:${i + 1}:const x${i} = ${i}`)
    const content = lines.join("\n")
    const result = compressByType(content, 150)
    expect(result.length).toBeLessThanOrEqual(150)
  })

  test("compresses HTML by extracting text", () => {
    const content = "<!doctype html><html><body><h1>Title</h1><p>Hello world content here</p></body></html>"
    const result = compressByType(content, 50)
    expect(result.length).toBeLessThanOrEqual(50)
  })

  test("uses fallback truncation marker for plain text", () => {
    const content = "a".repeat(200)
    const result = compressByType(content, 50)
    expect(result).toContain("[Tool output truncated for compaction: omitted 150 chars]")
    expect(result.length).toBeLessThanOrEqual(50 + "[Tool output truncated for compaction: omitted 150 chars]".length + 1)
  })

  test("fallback marker is absent when nothing is omitted", () => {
    const content = "short"
    const result = compressByType(content, 100)
    expect(result).toBe("short")
    expect(result).not.toContain("truncated")
  })
})

describe("compressByType with config", () => {
  test("disabled smart compression falls back to plain truncation", () => {
    const content = JSON.stringify({ name: "test", value: "x".repeat(500) })
    const result = compressByType(content, 50, { enabled: false })
    expect(result.length).toBeLessThanOrEqual(50 + 100)
    expect(result).toContain("truncated")
  })

  test("individual compressor disabled falls back to plain truncation", () => {
    const content = JSON.stringify({ name: "test", value: "x".repeat(500) })
    const result = compressByType(content, 50, { compressors: { json: false } })
    expect(result.length).toBeLessThanOrEqual(50 + 100)
    expect(result).toContain("truncated")
  })

  test("other compressors still work when one is disabled", () => {
    const logLines = Array.from({ length: 30 }, (_, i) =>
      i % 5 === 0 ? `ERROR failure at line ${i}` : `DEBUG verbose at line ${i}`
    ).join("\n")
    const result = compressByType(logLines, 100, { compressors: { json: false } })
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result).toContain("ERROR")
  })

  test("individual compressor can be explicitly enabled", () => {
    const content = JSON.stringify({ data: "x".repeat(500) })
    const result = compressByType(content, 50, { compressors: { json: true } })
    expect(result.length).toBeLessThanOrEqual(50)
  })
})
