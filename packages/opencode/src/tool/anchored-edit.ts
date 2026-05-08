import { Effect, Schema } from "effect"
import * as fs from "fs/promises"
import * as path from "path"
import * as Tool from "./tool"
import { InstanceState } from "@/effect/instance-state"

import {
    reconcileAnchors,
    formatLineWithAnchor,
    splitAnchor,
    stripAnchors,
    getAnchorDelimiter,
} from "./anchor-state"
import DESCRIPTION from "./anchored-edit.txt"

// ─── Parameter schemas ───────────────────────────────────────────────────

const EditEntry = Schema.Struct({
    anchor: Schema.String.annotate({
        description: "Start anchor in format: AnchorWord┃line content",
    }),
    end_anchor: Schema.optional(Schema.String).annotate({
        description: "End anchor for replace operations (inclusive)",
    }),
    edit_type: Schema.Literals(["replace", "insert_after", "insert_before"]).annotate({
        description: "Type of edit to perform",
    }),
    text: Schema.String.annotate({
        description: "New content to insert (raw code, no anchor prefixes)",
    }),
})

const FileEntry = Schema.Struct({
    path: Schema.String.annotate({
        description: "Relative file path from workspace root",
    }),
    edits: Schema.optional(Schema.Array(EditEntry)).annotate({
        description: "Edits to apply. Omit for read-only operation.",
    }),
})

export const Parameters = Schema.Struct({
    operation: Schema.Literals(["read", "edit"]).annotate({
        description: "read: get file contents with anchors. edit: apply anchor-based edits.",
    }),
    files: Schema.Array(FileEntry).annotate({
        description: "Files to read or edit. Multiple files supported for batching.",
    }),
})

// ─── Anchor resolution ───────────────────────────────────────────────────

interface ResolvedEdit {
    lineIdx: number
    endIdx: number
    edit: Schema.Schema.Type<typeof EditEntry>
}

interface FailedEdit {
    edit: Schema.Schema.Type<typeof EditEntry>
    error: string
}

function resolveAnchor(
    type: "anchor" | "end_anchor",
    raw: string | undefined,
    anchors: string[],
    lines: string[],
): { index: number; error?: string } {
    if (!raw || !raw.trim()) return { index: -1, error: `${type} is missing.` }

    const delim = getAnchorDelimiter()
    const { anchor: anchorName, content: providedContent } = splitAnchor(raw)

    if (!anchorName) {
        return { index: -1, error: `${type} is empty or incorrectly formatted.` }
    }

    const index = anchors.indexOf(anchorName)
    if (index === -1) {
        return {
            index: -1,
            error: `${type} "${anchorName}" not found. Use the latest anchors from the most recent read output.`,
        }
    }

    if (providedContent.includes("\n") || providedContent.includes("\r")) {
        return {
            index: -1,
            error: `${type} "${anchorName}" — the provided content contains newlines. Anchors reference single lines only.`,
        }
    }

    if (providedContent && providedContent !== lines[index]) {
        return {
            index: -1,
            error: `${type} "${anchorName}" content mismatch. Expected: "${lines[index]}", got: "${providedContent}".`,
        }
    }

    return { index }
}

function resolveEdits(
    edits: Schema.Schema.Type<typeof EditEntry>[],
    lines: string[],
    anchors: string[],
): { resolved: ResolvedEdit[]; failed: FailedEdit[] } {
    const resolved: ResolvedEdit[] = []
    const failed: FailedEdit[] = []

    for (const edit of edits) {
        const diagnostics: string[] = []

        const { index: startIdx, error: startErr } = resolveAnchor("anchor", edit.anchor, anchors, lines)
        if (startErr) diagnostics.push(startErr)

        let endIdx = startIdx
        if (edit.edit_type === "replace") {
            const { index: resolvedEnd, error: endErr } = resolveAnchor("end_anchor", edit.end_anchor, anchors, lines)
            if (endErr) diagnostics.push(endErr)
            endIdx = resolvedEnd
        }

        if (startIdx !== -1 && endIdx !== -1 && endIdx < startIdx) {
            diagnostics.push("Range error: anchor must precede or equal end_anchor.")
        }

        if (diagnostics.length > 0) {
            failed.push({ edit, error: diagnostics.join(" ") })
        } else {
            resolved.push({ lineIdx: startIdx, endIdx, edit })
        }
    }
    return { resolved, failed }
}

// ─── Edit application ────────────────────────────────────────────────────

interface AppliedEdit {
    originalStartIdx: number
    originalEndIdx: number
    linesAdded: number
    linesDeleted: number
    edit: Schema.Schema.Type<typeof EditEntry>
}

function applyEdits(
    lines: string[],
    resolved: ResolvedEdit[],
): { finalLines: string[]; applied: AppliedEdit[] } {
    const sorted = [...resolved].sort((a, b) => b.lineIdx - a.lineIdx)
    const newLines = [...lines]
    const applied: AppliedEdit[] = []

    for (const { lineIdx, endIdx, edit } of sorted) {
        const cleanText = stripAnchors(edit.text || "")
        const replacementLines = cleanText === "" ? [] : cleanText.split(/\r?\n/)
        let spliceIdx: number
        let removeCount: number

        if (edit.edit_type === "insert_after") {
            spliceIdx = lineIdx + 1
            removeCount = 0
        } else if (edit.edit_type === "insert_before") {
            spliceIdx = lineIdx
            removeCount = 0
        } else {
            spliceIdx = lineIdx
            removeCount = endIdx - lineIdx + 1
        }

        newLines.splice(spliceIdx, removeCount, ...replacementLines)
        applied.push({
            originalStartIdx: lineIdx,
            originalEndIdx: edit.edit_type === "replace" ? endIdx : lineIdx,
            linesAdded: replacementLines.length,
            linesDeleted: removeCount,
            edit,
        })
    }
    return { finalLines: newLines, applied }
}

// ─── Diff formatting ─────────────────────────────────────────────────────

function formatDiff(
    originalLines: string[],
    originalAnchors: string[],
    applied: AppliedEdit[],
): string {
    const sorted = [...applied].sort((a, b) => a.originalStartIdx - b.originalStartIdx)
    const parts: string[] = []

    for (const a of sorted) {
        const ctxStart = Math.max(0, a.originalStartIdx - 2)
        const ctxEnd = Math.min(originalLines.length, (a.edit.edit_type === "replace" ? a.originalEndIdx : a.originalStartIdx) + 2)
        const before = originalLines.slice(ctxStart, a.originalStartIdx).map((l: string, i: number) => ` ${formatLineWithAnchor(l, originalAnchors[ctxStart + i])}`)
        const removed = a.edit.edit_type === "replace"
            ? originalLines.slice(a.originalStartIdx, a.originalEndIdx + 1).map((l, i) => `-${formatLineWithAnchor(l, originalAnchors[a.originalStartIdx + i])}`)
            : []
        const addedText = stripAnchors(a.edit.text || "")
        const added = addedText === "" ? [] : addedText.split(/\r?\n/).map((l) => `+${l}`)
        const afterStart = a.edit.edit_type === "replace" ? a.originalEndIdx + 1 : a.originalStartIdx + 1
        const after = originalLines.slice(afterStart, Math.min(originalLines.length, afterStart + 2)).map((l, i) => ` ${formatLineWithAnchor(l, originalAnchors[afterStart + i])}`)

        parts.push([...before, ...removed, ...added, ...after].join("\n"))
    }
    return parts.join("\n\n---\n\n")
}

// ─── Read handler ────────────────────────────────────────────────────────

function handleRead(
    absolutePath: string,
    displayPath: string,
    lines: string[],
    anchors: string[],
): string {
    const formatted = lines.map((line, i) => formatLineWithAnchor(line, anchors[i])).join("\n")
    return `*** ${displayPath} (${lines.length} lines)\n\n${formatted}`
}

// ─── Tool definition ─────────────────────────────────────────────────────

export const AnchoredEditTool = Tool.define(
    "anchored_edit",
    Effect.gen(function* () {
        return {
            description: DESCRIPTION,
            parameters: Parameters,
            execute: (
                params: Schema.Schema.Type<typeof Parameters>,
                ctx: Tool.Context,
            ) =>
                Effect.gen(function* () {
                    const ins = yield* InstanceState.context

                    yield* ctx.ask({
                        permission: "anchored_edit",
                        patterns: params.files.map((f) => f.path),
                        always: ["*"],
                        metadata: { operation: params.operation },
                    })

                    const results: string[] = []
                    let totalEdits = 0
                    let totalFailed = 0
                    let totalAdded = 0
                    let totalRemoved = 0
                    const filesProcessed: string[] = []

                    for (const file of params.files) {
                        const absolutePath = path.resolve(ins.directory, file.path)
                        const displayPath = file.path

                        let content: string
                        try {
                            content = yield* Effect.promise(() => fs.readFile(absolutePath, "utf8"))
                        } catch (err) {
                            if (params.operation === "edit") {
                                results.push(`Error: Cannot read ${displayPath}: ${err}`)
                                continue
                            }
                            results.push(`Error: File not found: ${displayPath}`)
                            continue
                        }

                        const lines = content.split(/\r?\n/)
                        const anchors = reconcileAnchors(absolutePath, lines, ctx.sessionID)

                        if (params.operation === "read") {
                            results.push(handleRead(absolutePath, displayPath, lines, anchors))
                            filesProcessed.push(displayPath)
                            continue
                        }

                        // ── Edit operation ──
                        if (!file.edits || file.edits.length === 0) {
                            results.push(handleRead(absolutePath, displayPath, lines, anchors))
                            filesProcessed.push(displayPath)
                            continue
                        }

                        const { resolved, failed } = resolveEdits([...file.edits], lines, anchors)
                        totalFailed += failed.length

                        if (resolved.length === 0) {
                            const msgs = failed.map(
                                (f) =>
                                    `Edit (anchor: "${f.edit.anchor}") failed: ${f.error}`,
                            )
                            results.push(`*** ${displayPath} — all edits failed:\n\n${msgs.join("\n\n")}`)
                            continue
                        }

                        const { finalLines, applied } = applyEdits(lines, resolved)
                        const finalContent = finalLines.join("\n")

                        // Write file
                        try {
                            yield* Effect.promise(() => fs.writeFile(absolutePath, finalContent, "utf8"))
                        } catch (err) {
                            results.push(`Error writing ${displayPath}: ${err}`)
                            continue
                        }

                        // Reconcile new anchors after write
                        const newAnchors = reconcileAnchors(absolutePath, finalLines, ctx.sessionID)

                        // Stats
                        let fileAdded = 0
                        let fileRemoved = 0
                        for (const a of applied) {
                            fileAdded += a.linesAdded
                            fileRemoved += a.linesDeleted
                        }
                        totalAdded += fileAdded
                        totalRemoved += fileRemoved
                        totalEdits += resolved.length

                        // Diff output
                        const diff = formatDiff(lines, anchors, applied)

                        // Updated regions with new anchors (context around each edit)
                        const updatedRegions: string[] = []
                        const sortedApplied = [...applied].sort((a, b) => a.originalStartIdx - b.originalStartIdx)
                        let shift = 0
                        for (const a of sortedApplied) {
                            const newStart = Math.max(0, a.originalStartIdx + shift - 2)
                            const editEnd = a.originalStartIdx + shift + a.linesAdded
                            const newEnd = Math.min(finalLines.length - 1, editEnd + 2)
                            const region = finalLines.slice(newStart, newEnd + 1).map((l, i) => formatLineWithAnchor(l, newAnchors[newStart + i])).join("\n")
                            updatedRegions.push(region)
                            shift += a.linesAdded - a.linesDeleted
                        }

                        const failedMsgs = failed.map((f: FailedEdit) => `FAILED: (anchor: "${f.edit.anchor}") — ${f.error}`)

                        results.push(
                            [
                                `*** ${displayPath} — ${resolved.length} edit(s) applied (+${fileAdded}, -${fileRemoved} lines)${failed.length > 0 ? `, ${failed.length} failed` : ""}`,
                                "",
                                diff,
                                "",
                                "Updated anchors around edited regions:",
                                updatedRegions.join("\n---\n"),
                                ...failedMsgs,
                            ].join("\n"),
                        )
                        filesProcessed.push(displayPath)
                    }

                    const op = params.operation
                    const title =
                        op === "read"
                            ? `Anchored Read (${filesProcessed.length} file${filesProcessed.length !== 1 ? "s" : ""})`
                            : `Anchored Edit: ${totalEdits} edit(s) across ${filesProcessed.length} file(s) (+${totalAdded}, -${totalRemoved})${totalFailed > 0 ? ` [${totalFailed} failed]` : ""}`

                    return {
                        title,
                        metadata: {
                            operation: op,
                            files: filesProcessed,
                            editsApplied: totalEdits,
                            editsFailed: totalFailed,
                            linesAdded: totalAdded,
                            linesRemoved: totalRemoved,
                        },
                        output: results.join("\n\n========================================\n\n"),
                    }
                }).pipe(Effect.orDie),
        }
    }),
)