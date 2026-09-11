const HTML_TAG_RE = /<[^>]+>/g
const HTML_ENTITY_RE = /&(#x?[0-9a-fA-Z]+|[a-zA-Z]+);/g
const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi
const STYLE_RE = /<style[\s\S]*?<\/style>/gi
const NAV_RE = /<nav[\s\S]*?<\/nav>/gi
const HEADER_RE = /<header[\s\S]*?<\/header>/gi
const FOOTER_RE = /<footer[\s\S]*?<\/footer>/gi
const ASIDE_RE = /<aside[\s\S]*?<\/aside>/gi
const COMMENT_RE = /<!--[\s\S]*?-->/g
const TITLE_RE = /<title[\s\S]*?>([\s\S]*?)<\/title>/i
const META_DESC_RE = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  divide: "÷",
}

function decodeEntities(text: string): string {
  return text.replace(HTML_ENTITY_RE, (match) => {
    const inner = match.slice(1, -1)
    if (inner.startsWith("#x")) {
      const code = parseInt(inner.slice(2), 16)
      return isNaN(code) ? match : String.fromCodePoint(code)
    }
    if (inner.startsWith("#")) {
      const code = parseInt(inner.slice(1), 10)
      return isNaN(code) ? match : String.fromCodePoint(code)
    }
    return HTML_ENTITIES[inner] ?? match
  })
}

function removeTags(text: string): string {
  return text.replace(HTML_TAG_RE, " ")
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim()
}

function extractMetadata(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(TITLE_RE)
  const title = titleMatch?.[1] ? decodeEntities(titleMatch[1].trim()) : null

  const metaMatch = html.match(META_DESC_RE)
  const description = metaMatch?.[1] ? decodeEntities(metaMatch[1].trim()) : null

  return { title, description }
}

export function extractHtml(content: string, maxChars: number): string {
  if (!content.trim()) return content

  const hasDoctype = /^\s*<!doctype\s+html/i.test(content)
  const hasHtmlTag = /<html[\s>]/i.test(content)
  if (!hasDoctype && !hasHtmlTag) return content

  const { title, description } = extractMetadata(content)

  let cleaned = content
  cleaned = cleaned.replace(SCRIPT_RE, "")
  cleaned = cleaned.replace(STYLE_RE, "")
  cleaned = cleaned.replace(NAV_RE, "")
  cleaned = cleaned.replace(HEADER_RE, "")
  cleaned = cleaned.replace(FOOTER_RE, "")
  cleaned = cleaned.replace(ASIDE_RE, "")
  cleaned = cleaned.replace(COMMENT_RE, "")

  let text = removeTags(cleaned)
  text = decodeEntities(text)
  text = collapseWhitespace(text)

  const parts: string[] = []
  if (title) parts.push(`Title: ${title}`)
  if (description) parts.push(`Description: ${description}`)
  parts.push(text)

  const result = parts.join("\n\n")
  if (result.length <= maxChars) return result
  return result.slice(0, maxChars)
}
