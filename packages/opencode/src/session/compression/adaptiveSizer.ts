// Adaptive compression sizing, ported from Headroom's
// `headroom/transforms/adaptive_sizer.py`.
//
// Instead of a hardcoded item cap, `computeOptimalK` statistically determines
// how many items are worth keeping by finding the "knee" of the cumulative
// unique-bigram coverage curve (Kneedle): the point where adding more items
// stops contributing new information. Items are ordered by descending score
// first (ties keep input order), so the result is deterministic.
//
// Three tiers, mirroring Headroom:
//   1. Fast path — n <= 8 (and near-total redundancy) short-circuits.
//   2. Kneedle on the unique-bigram coverage curve, with a diversity floor
//      when no clear knee exists.
//   3. A zlib compression-ratio sanity check that nudges K up 20% when the
//      selected subset is much more redundant than the full set.
//
// Pure and dependency-free apart from the `node:zlib` builtin used by the
// Tier 3 check (the same import style the rest of the package already uses).

import { deflateSync } from "node:zlib"

export interface AdaptiveSizerItem {
  id: string
  score: number
}

export interface AdaptiveSizerOptions {
  minK?: number
  maxK?: number
}

export function computeOptimalK(items: AdaptiveSizerItem[], opts: AdaptiveSizerOptions = {}): number {
  const minK = opts.minK ?? 3
  const n = items.length
  const effectiveMax = opts.maxK ?? n

  if (n <= 8) return Math.min(n, effectiveMax)

  const ids = stableScoreOrder(items)

  const uniqueCount = countUniqueSimhash(ids)
  if (uniqueCount <= 3) return Math.min(Math.max(minK, uniqueCount), effectiveMax)

  const curve = uniqueBigramCurve(ids)
  let knee = findKnee(curve)
  const diversity = uniqueCount / n

  if (knee === null) {
    // No saturation found — each item adds new information. Scale the
    // keep-fraction continuously with diversity: all-unique keeps everything,
    // mostly-duplicate keeps the old ~30% floor.
    knee = Math.max(minK, Math.floor(n * (0.3 + 0.7 * diversity)))
  } else if (diversity > 0.7) {
    // A high-diversity curve can bend for shallow bigram overlap; don't let
    // that drop us below the diversity floor.
    knee = Math.max(knee, Math.max(minK, Math.floor(n * (0.3 + 0.7 * diversity))))
  }

  let k = Math.min(Math.max(minK, knee), effectiveMax)
  k = validateWithZlib(ids, k, effectiveMax)
  return Math.max(minK, Math.min(k, effectiveMax))
}

function stableScoreOrder(items: AdaptiveSizerItem[]): string[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aScore = Number.isFinite(a.item.score) ? a.item.score : 0
      const bScore = Number.isFinite(b.item.score) ? b.item.score : 0
      return bScore - aScore || a.index - b.index
    })
    .map((entry) => entry.item.id)
}

// ─── Tier 2: Kneedle ─────────────────────────────────────────────────────

export function findKnee(curve: number[]): number | null {
  const n = curve.length
  if (n < 3) return null

  const xMin = 0
  const xMax = n - 1
  const yMin = curve[0]!
  const yMax = curve[n - 1]!

  if (yMax === yMin) return 1

  const xRange = xMax - xMin
  const yRange = yMax - yMin

  let maxDiff = -1
  let kneeIndex: number | null = null
  for (let i = 0; i < n; i++) {
    const xNorm = (i - xMin) / xRange
    const yNorm = (curve[i]! - yMin) / yRange
    const diff = yNorm - xNorm
    if (diff > maxDiff) {
      maxDiff = diff
      kneeIndex = i
    }
  }

  if (maxDiff < 0.05) return null
  return kneeIndex === null ? null : kneeIndex + 1
}

export function uniqueBigramCurve(items: string[]): number[] {
  const seen = new Set<string>()
  const curve: number[] = []

  for (const item of items) {
    const words = item
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0)

    if (words.length >= 2) {
      for (let i = 0; i < words.length - 1; i++) seen.add(`${words[i]}\u0000${words[i + 1]}`)
    } else if (words.length === 1 && words[0]!.length >= 2 && hasCjk(words[0]!)) {
      // Spaceless CJK item: word-splitting yields one giant token with no
      // coverage signal, so fall back to character bigrams.
      const word = words[0]!
      for (let i = 0; i < word.length - 1; i++) seen.add(`${word[i]}\u0000${word[i + 1]}`)
    } else {
      seen.add(`${words[0] ?? ""}\u0000`)
    }

    curve.push(seen.size)
  }

  return curve
}

function hasCjk(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      return true
    }
  }
  return false
}

// ─── SimHash clustering ──────────────────────────────────────────────────

function fnv1a64(text: string): bigint {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i))
    hash = (hash * prime) & mask
  }
  return hash
}

function simhash(text: string): bigint {
  const lower = text.toLowerCase()
  const votes = new Array<number>(64).fill(0)
  const grams = Math.max(1, lower.length - 3)
  for (let i = 0; i < grams; i++) {
    const hash = fnv1a64(lower.slice(i, i + 4))
    for (let bit = 0; bit < 64; bit++) {
      votes[bit] += (hash >> BigInt(bit)) & 1n ? 1 : -1
    }
  }
  let fingerprint = 0n
  for (let bit = 0; bit < 64; bit++) {
    if (votes[bit]! > 0) fingerprint |= 1n << BigInt(bit)
  }
  return fingerprint
}

function popcount64(value: bigint): number {
  let remaining = value
  let count = 0
  while (remaining > 0n) {
    remaining &= remaining - 1n
    count++
  }
  return count
}

export function countUniqueSimhash(items: string[], threshold = 3): number {
  if (items.length === 0) return 0

  const cache = new Map<string, bigint>()
  const fingerprint = (item: string): bigint => {
    const cached = cache.get(item)
    if (cached !== undefined) return cached
    const value = simhash(item)
    cache.set(item, value)
    return value
  }

  const clusters: bigint[] = []
  for (const item of items) {
    const hash = fingerprint(item)
    let matched = false
    for (const representative of clusters) {
      if (popcount64(hash ^ representative) <= threshold) {
        matched = true
        break
      }
    }
    if (!matched) clusters.push(hash)
  }
  return clusters.length
}

// ─── Tier 3: zlib sanity check ───────────────────────────────────────────

function validateWithZlib(items: string[], k: number, maxK: number, tolerance = 0.15): number {
  if (k >= items.length || k >= maxK) return k

  const full = Buffer.from(items.join("\n"))
  const subset = Buffer.from(items.slice(0, k).join("\n"))

  // Skip validation for very small content — zlib overhead dominates.
  if (full.length < 200) return k

  const fullRatio = deflateSync(full, { level: 1 }).length / full.length
  const subsetRatio = deflateSync(subset, { level: 1 }).length / subset.length
  const ratioDiff = Math.abs(fullRatio - subsetRatio)

  if (ratioDiff > tolerance) return Math.min(Math.floor(k * 1.2), maxK)
  return k
}
