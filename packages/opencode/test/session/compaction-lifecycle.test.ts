import { describe, expect, test } from "bun:test"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { applyReadLifecycle } from "../../src/session/compaction-lifecycle"

type ToolOptions = {
  status?: "completed" | "running" | "pending" | "error"
  compacted?: number
}

let seq = 0

function tool(name: string, input: unknown, output: string, options: ToolOptions = {}): SessionV1.ToolPart {
  seq++
  const base = {
    id: `part_${seq}`,
    sessionID: "ses_test",
    messageID: `msg_${seq}`,
    type: "tool" as const,
    callID: `call_${seq}`,
    tool: name,
  }
  const status = options.status ?? "completed"
  const state =
    status === "completed"
      ? {
          status,
          input,
          output,
          title: name,
          metadata: {},
          time: { start: 1, end: 2, ...(options.compacted !== undefined ? { compacted: options.compacted } : {}) },
        }
      : status === "running"
        ? { status, input, title: name, metadata: {}, time: { start: 1 } }
        : status === "pending"
          ? { status, input, raw: "" }
          : { status, input, error: output, metadata: {}, time: { start: 1, end: 2 } }
  return { ...base, state } as unknown as SessionV1.ToolPart
}

function assistant(parts: SessionV1.Part[]): SessionV1.WithParts {
  return { info: { role: "assistant" } as SessionV1.Assistant, parts }
}

function output(part: SessionV1.ToolPart): string | undefined {
  return part.state.status === "completed" ? part.state.output : undefined
}

const stale = (path: string, tool: string) =>
  `[Tool result: ${path} — stale: modified later by ${tool}; re-read for current contents]`
const superseded = (path: string) => `[Tool result: ${path} — superseded by a newer read of the same file]`
const duplicate = (tool: string) => `[Tool result: identical to a later ${tool} call]`

describe("applyReadLifecycle", () => {
  test("replaces a read made stale by a later edit or write", () => {
    for (const writer of ["edit", "write", "apply_patch", "anchored_edit"]) {
      const read = tool("read", { filePath: "/src/a.ts" }, "export const a = 1")
      const write = tool(writer, { filePath: "/src/a.ts" }, "ok")
      const messages = [assistant([read, write])]

      expect(applyReadLifecycle(messages)).toBe(1)
      expect(output(read)).toBe(stale("/src/a.ts", writer))
      expect(output(write)).toBe("ok")
    }
  })

  test("replaces a read superseded by a newer read of the same file", () => {
    const first = tool("read", { filePath: "/src/a.ts" }, "old contents")
    const second = tool("read", { filePath: "/src/a.ts" }, "new contents")
    const messages = [assistant([first]), assistant([second])]

    expect(applyReadLifecycle(messages)).toBe(1)
    expect(output(first)).toBe(superseded("/src/a.ts"))
    expect(output(second)).toBe("new contents")
  })

  test("preserves the newest read of each path", () => {
    const older = tool("read", { filePath: "/a.ts" }, "one")
    const newest = tool("read", { filePath: "/a.ts" }, "two")
    const edit = tool("edit", { filePath: "/a.ts" }, "ok")
    const messages = [assistant([older, edit, newest])]

    expect(applyReadLifecycle(messages)).toBe(1)
    expect(output(older)).toBe(stale("/a.ts", "edit"))
    expect(output(newest)).toBe("two")
  })

  test("does not cross paths when marking stale or superseded", () => {
    const readA = tool("read", { filePath: "/a.ts" }, "a")
    const readB = tool("read", { filePath: "/b.ts" }, "b")
    const editB = tool("edit", { filePath: "/b.ts" }, "ok")
    const messages = [assistant([readA, readB, editB])]

    expect(applyReadLifecycle(messages)).toBe(1)
    expect(output(readA)).toBe("a")
    expect(output(readB)).toBe(stale("/b.ts", "edit"))
  })

  test("dedupes repeated tool outputs, keeping the latest occurrence", () => {
    const shared = "z".repeat(250)
    const first = tool("bash", { command: "one" }, shared)
    const second = tool("bash", { command: "two" }, shared)
    const third = tool("bash", { command: "three" }, shared)
    const messages = [assistant([first]), assistant([second]), assistant([third])]

    expect(applyReadLifecycle(messages)).toBe(2)
    expect(output(first)).toBe(duplicate("bash"))
    expect(output(second)).toBe(duplicate("bash"))
    expect(output(third)).toBe(shared)
  })

  test("leaves short repeated outputs alone", () => {
    const shared = "z".repeat(199)
    const first = tool("bash", { command: "one" }, shared)
    const second = tool("bash", { command: "two" }, shared)
    const messages = [assistant([first, second])]

    expect(applyReadLifecycle(messages)).toBe(0)
    expect(output(first)).toBe(shared)
    expect(output(second)).toBe(shared)
  })

  test("does not dedupe outputs that already carry a marker", () => {
    const shared = `[Tool result: already replaced] ${"z".repeat(300)}`
    const first = tool("bash", { command: "one" }, shared)
    const second = tool("bash", { command: "two" }, shared)
    const messages = [assistant([first, second])]

    expect(applyReadLifecycle(messages)).toBe(0)
    expect(output(first)).toBe(shared)
    expect(output(second)).toBe(shared)
  })

  test("skips already-compacted parts", () => {
    const shared = "z".repeat(250)
    const compacted = tool("read", { filePath: "/a.ts" }, shared, { compacted: 42 })
    const live = tool("bash", { command: "one" }, shared)
    const messages = [assistant([compacted, live])]

    expect(applyReadLifecycle(messages)).toBe(0)
    expect(output(compacted)).toBe(shared)
    expect(output(live)).toBe(shared)
  })

  test("never touches skill parts", () => {
    const shared = "z".repeat(250)
    const first = tool("skill", { name: "one" }, shared)
    const second = tool("skill", { name: "two" }, shared)
    const read = tool("read", { filePath: "/a.ts" }, "content")
    const edit = tool("edit", { filePath: "/a.ts" }, "ok")
    const messages = [assistant([first, second, read, edit])]

    expect(applyReadLifecycle(messages)).toBe(1)
    expect(output(first)).toBe(shared)
    expect(output(second)).toBe(shared)
    expect(output(read)).toBe(stale("/a.ts", "edit"))
  })

  test("tolerates missing, odd and case-varied inputs", () => {
    const noInput = tool("read", {}, "a")
    const nullInput = tool("read", null, "b")
    const numberPath = tool("read", { path: 42 }, "c")
    const emptyPath = tool("read", { path: "" }, "d")
    const pendingWrite = tool("write", { filePath: "/p.ts" }, "", { status: "pending" })
    const readP = tool("read", { filePath: "/p.ts" }, "e")
    const messages = [assistant([noInput, nullInput, numberPath, emptyPath, readP, pendingWrite])]

    expect(applyReadLifecycle(messages)).toBe(0)
    expect(output(noInput)).toBe("a")
    expect(output(nullInput)).toBe("b")
    expect(output(numberPath)).toBe("c")
    expect(output(emptyPath)).toBe("d")
    expect(output(readP)).toBe("e")
  })

  test("matches path keys case-insensitively and honors started writes", () => {
    const read = tool("read", { PATH: "/UP.ts" }, "upper")
    const running = tool("write", { FilePath: "/UP.ts" }, "", { status: "running" })
    const messages = [assistant([read, running])]

    expect(applyReadLifecycle(messages)).toBe(1)
    expect(output(read)).toBe(stale("/UP.ts", "write"))
  })

  test("is fail-open on malformed parts", () => {
    const noState = {
      type: "tool",
      tool: "read",
      callID: "call_bad",
      id: "part_bad",
      sessionID: "ses_test",
      messageID: "msg_bad",
    } as unknown as SessionV1.Part
    const noOutput = tool("read", { filePath: "/x.ts" }, "content")
    noOutput.state = { status: "completed" } as unknown as SessionV1.ToolState
    const read = tool("read", { filePath: "/a.ts" }, "content")
    const edit = tool("edit", { filePath: "/a.ts" }, "ok")
    const messages = [assistant([noState, noOutput, read, edit])]

    let count = 0
    expect(() => {
      count = applyReadLifecycle(messages)
    }).not.toThrow()
    expect(count).toBe(1)
    expect(output(read)).toBe(stale("/a.ts", "edit"))
  })

  test("returns 0 without throwing on non-array input", () => {
    expect(applyReadLifecycle(undefined as unknown as SessionV1.WithParts[])).toBe(0)
    expect(applyReadLifecycle(null as unknown as SessionV1.WithParts[])).toBe(0)
    expect(applyReadLifecycle([undefined as unknown as SessionV1.WithParts])).toBe(0)
  })

  test("is deterministic", () => {
    const build = () => {
      seq = 0
      const shared = "z".repeat(240)
      return [
        assistant([
          tool("read", { filePath: "/a.ts" }, "alpha"),
          tool("edit", { filePath: "/a.ts" }, "ok"),
          tool("read", { filePath: "/b.ts" }, shared),
          tool("read", { filePath: "/c.ts" }, shared),
          tool("skill", { name: "s" }, shared),
        ]),
      ]
    }

    const first = build()
    const second = build()
    expect(applyReadLifecycle(first)).toBe(2)
    expect(applyReadLifecycle(second)).toBe(2)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
