// Line-level protection shared by the compression transforms.
//
// CRITICAL_LINE_RE guards lossy transforms (dense-line elision) from dropping
// lines that carry failure signals. MUST_KEEP_RE is ported from Headroom's
// Kompress token compressor: it protects tokens an agent cannot reconstruct
// from context (negations/modals, ALLCAPS identifiers, paths, extensions,
// versions, --flags, hex, CamelCase) and is exported for the token-level
// compressors that will build on this module.

export const CRITICAL_LINE_RE = /\b(?:ERROR|FATAL|CRITICAL|Traceback|panic|exception|assertion)/i

const MUST_KEEP_STRUCTURAL = [
  String.raw`\b0x[0-9A-Fa-f]+\b`, // hex addresses/IDs: 0x7fff2038
  String.raw`(?<![\w.])\d+(?:\.\d+)?(?![\w.])`, // standalone numbers: 42, 3.14
  String.raw`[A-Z_]{2,}`, // ALLCAPS: SIGILL, HTTP, EOF, ERROR
  String.raw`[a-z_][a-z0-9_]*\.[a-z0-9_]+`, // dotted.paths: libsystem_kernel.dylib
  String.raw`/[a-z0-9/._-]{2,}`, // unix paths: /usr/lib/python3.so
  String.raw`\.[a-z]{2,4}\b`, // extensions: .py .so .json
  String.raw`--?[a-z][\w-]*`, // flags: --verbose, -n
  String.raw`\b[A-Z][a-z]+[A-Z]\w*`, // CamelCase: IndexError, EXC_BAD_INSTRUCTION
].join("|")

// Directive words protect tokens whose loss INVERTS the surrounding sentence
// ("do not guess" without its "not"), boolean connectives decide which
// predicates must hold. Both are case-insensitive in Headroom; scoped inline
// modifier groups keep the structural classes above case-sensitive.
const MUST_KEEP_DIRECTIVES = String.raw`\b(?:not|never|none|cannot|can't|don't|doesn't|didn't|won't|shouldn't|mustn't|isn't|aren't|avoid|refuse|prohibited|forbidden|disallow|unless|except|without|must|should|shall|required|always|only|mandatory)\b`
const MUST_KEEP_CONNECTIVES = String.raw`\b(?:and|or|nor|xor)\b`

export const MUST_KEEP_RE = new RegExp(
  `${MUST_KEEP_STRUCTURAL}|(?i:${MUST_KEEP_DIRECTIVES})|(?i:${MUST_KEEP_CONNECTIVES})`,
)

export function isCriticalLine(line: string): boolean {
  if (typeof line !== "string" || !line) return false
  return CRITICAL_LINE_RE.test(line)
}
