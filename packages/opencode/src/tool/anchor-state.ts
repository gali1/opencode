/**
 * AnchorStateManager — Stable word-based line anchors for OpenCode.
 *
 * Each line in a tracked file gets a unique two-word anchor (e.g. "AppleBronze").
 * When the file changes, a greedy order-preserving hash match carries unchanged
 * lines' anchors forward. New/changed lines get fresh anchors.
 *
 * Ported from Dirac's hash-anchored edit system.
 */

const DELIMITER = "┃"

const DICTIONARY =
    "Apple Banana Cherry Date Elder Fig Grape Honey Iris Jade Kale Lemon Mango Nut Oak Palm Quail Rose Sage Tulip Urn Vine Wheat Xenon Yarn Zinc Amber Bronze Cedar Dawn Echo Frost Gold Haven Ivory Jewel Knoll Lake Moon Nest Ocean Pearl Quest Rain Snow Tide Umber Vale Wind Apex Bloom Coral Dusk Ember Fern Glen Haze Inlet Keep Luna Marsh Noble Olive Petal Ridge Storm Thorn Unity Vigor Wren Zenith Arc Bay Cove Dell Edge Fleet Grove Hill Isle Joy Knot Ledge Mesa Nook Opal Pike Reef Shard Trail Vault Wave Azure Birch Cliff Drift Elm Forge Glade Heath Iron Jet Kelp Lark Mint Nova Orbit Plume Rift Slate Terra Aura Blaze Crest Drake Flint Glyph Helm Ingot Lynx Mist Nexus Prism Rune Spark Tusk Veil Wing Aspen Brook Crane Dune Flare Gust Hawk Ivy Kite Loom Moth Nile Onyx Pine Quartz Raven Seal Talon Wilt Yew Ash Bolt Clay Dove Elk Fir Gem Harp Ice Jolt Kit Lace Moss Ore Pyre Quill Rue Silk Torch Vow Wax Yoke Zeal Acorn Basil Cloak Drape Finch Gorge Heron Maple Oasis Poppy Roost Spruce Thyme Briar Dew Grit Plum Shoal".split(
        " ",
    )

interface TrackedDocument {
    hashes: Uint32Array
    anchors: string[]
    usedWords: Set<string>
    pool: string[]
}

const storage = new Map<string, Map<string, TrackedDocument>>()
const MAX_LINES = 50_000
const MAX_FILES = 1024
const MAX_TASKS = 50

function fnv1a(line: string): number {
    let h = 2166136261
    for (let j = 0; j < line.length; j++) {
        h = Math.imul(h ^ line.charCodeAt(j), 16777619)
    }
    return h >>> 0
}

function computeHashes(lines: string[]): Uint32Array {
    const hashes = new Uint32Array(lines.length)
    for (let i = 0; i < lines.length; i++) {
        hashes[i] = fnv1a(lines[i])
    }
    return hashes
}

function shuffle(arr: string[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
}

function refillPool(usedWords: Set<string>, pool: string[]) {
    const dict = DICTIONARY
    const len = dict.length
    const batch: string[] = []
    let attempts = 0
    while (batch.length < 8000 && attempts < 40000) {
        const w1 = dict[Math.floor(Math.random() * len)]
        const w2 = dict[Math.floor(Math.random() * len)]
        const word = `${w1}${w2}`
        if (!usedWords.has(word)) {
            batch.push(word)
        }
        attempts++
    }
    if (batch.length < 50) {
        for (let i = 0; i < 200; i++) {
            const w1 = dict[Math.floor(Math.random() * len)]
            const w2 = dict[Math.floor(Math.random() * len)]
            const w3 = dict[Math.floor(Math.random() * len)]
            const word = `${w1}${w2}${w3}`
            if (!usedWords.has(word)) batch.push(word)
        }
    }
    shuffle(batch)
    pool.push(...batch)
}

function getUniqueWord(usedWords: Set<string>, pool: string[]): string {
    while (true) {
        if (pool.length === 0) refillPool(usedWords, pool)
        const word = pool.pop()!
        if (!usedWords.has(word)) return word
    }
}

function getTaskState(taskId = "default"): Map<string, TrackedDocument> {
    let state = storage.get(taskId)
    if (!state) {
        state = new Map()
        storage.set(taskId, state)
        if (storage.size > MAX_TASKS) {
            const oldest = storage.keys().next().value
            if (oldest !== undefined) storage.delete(oldest)
        }
    } else {
        storage.delete(taskId)
        storage.set(taskId, state)
    }
    return state
}

function updateState(absolutePath: string, doc: TrackedDocument, taskId?: string) {
    const state = getTaskState(taskId)
    state.delete(absolutePath)
    state.set(absolutePath, doc)
    if (state.size > MAX_FILES) {
        const oldest = state.keys().next().value
        if (oldest !== undefined) state.delete(oldest)
    }
}

/**
 * Reconcile file content with stored state. Unchanged lines keep their anchors.
 * New/modified lines get fresh unique word anchors.
 */
export function reconcileAnchors(absolutePath: string, currentLines: string[], taskId?: string): string[] {
    if (currentLines.length > MAX_LINES) {
        return currentLines.map((_, i) => `L${i + 1}`)
    }

    const state = getTaskState(taskId)
    const currentHashes = computeHashes(currentLines)
    let tracked = state.get(absolutePath)

    // Fast path: identical hashes
    if (tracked && tracked.hashes.length === currentHashes.length) {
        let identical = true
        for (let i = 0; i < currentHashes.length; i++) {
            if (tracked.hashes[i] !== currentHashes[i]) {
                identical = false
                break
            }
        }
        if (identical) {
            updateState(absolutePath, tracked, taskId)
            return tracked.anchors
        }
    }

    // First time: assign unique anchors to every line
    if (!tracked) {
        const usedWords = new Set<string>()
        const pool = [...DICTIONARY]
        shuffle(pool)
        const anchors = currentLines.map(() => {
            const w = getUniqueWord(usedWords, pool)
            usedWords.add(w)
            return w
        })
        tracked = { hashes: currentHashes, anchors, usedWords, pool }
        updateState(absolutePath, tracked, taskId)
        return anchors
    }

    // Greedy order-preserving hash match (simpler than Myers diff, no dependency)
    const oldMap = new Map<number, number[]>()
    for (let i = 0; i < tracked.hashes.length; i++) {
        const h = tracked.hashes[i]
        const list = oldMap.get(h)
        if (list) list.push(i)
        else oldMap.set(h, [i])
    }

    const newAnchors: string[] = new Array(currentHashes.length)
    const newUsed = new Set<string>(tracked.usedWords)
    const pool = tracked.pool.length > 0 ? tracked.pool : []

    let lastOldIdx = -1
    for (let i = 0; i < currentHashes.length; i++) {
        const candidates = oldMap.get(currentHashes[i])
        let matched = false
        if (candidates) {
            for (let c = 0; c < candidates.length; c++) {
                if (candidates[c] > lastOldIdx) {
                    newAnchors[i] = tracked.anchors[candidates[c]]
                    lastOldIdx = candidates[c]
                    candidates.splice(c, 1)
                    matched = true
                    break
                }
            }
        }
        if (!matched) {
            const word = getUniqueWord(newUsed, pool)
            newAnchors[i] = word
            newUsed.add(word)
        }
    }

    tracked = { hashes: currentHashes, anchors: newAnchors, usedWords: newUsed, pool }
    updateState(absolutePath, tracked, taskId)
    return newAnchors
}

/** Format a line with its anchor prefix. */
export function formatLineWithAnchor(content: string, anchor: string): string {
    return `${anchor}${DELIMITER}${content}`
}

/** Split raw anchor string into anchor word and content. */
export function splitAnchor(raw: string): { anchor: string; content: string } {
    const idx = raw.indexOf(DELIMITER)
    if (idx === -1) return { anchor: raw.trim(), content: "" }
    return { anchor: raw.substring(0, idx).trim(), content: raw.substring(idx + DELIMITER.length) }
}

/** Strip all anchor prefixes from text. */
export function stripAnchors(text: string): string {
    return text
        .split("\n")
        .map((line) => {
            const idx = line.indexOf(DELIMITER)
            return idx === -1 ? line : line.substring(idx + DELIMITER.length)
        })
        .join("\n")
}

/** Get the delimiter character. */
export function getAnchorDelimiter(): string {
    return DELIMITER
}

/** Content hash for function-level dedup. */
export function contentHash(content: string): string {
    return (fnv1a(content) >>> 0).toString(16).padStart(8, "0")
}

/** Clear state for a file or all files. */
export function clearAnchorState(absolutePath?: string, taskId?: string) {
    if (absolutePath) {
        getTaskState(taskId).delete(absolutePath)
    } else if (taskId) {
        storage.delete(taskId)
    } else {
        storage.clear()
    }
}

/** Check if a file is currently tracked. */
export function isAnchorTracked(absolutePath: string, taskId?: string): boolean {
    return getTaskState(taskId).has(absolutePath)
}

/** Get current anchors for a tracked file, or null. */
export function getAnchors(absolutePath: string, taskId?: string): string[] | null {
    return getTaskState(taskId).get(absolutePath)?.anchors ?? null
}