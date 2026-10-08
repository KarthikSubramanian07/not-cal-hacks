/**
 * RFC 9110 Accept parsing for Markdown content negotiation.
 *
 * Mirrors the acceptmarkdown.com Cloudflare Workers recipe: parse q-values,
 * prefer specificity over wildcards, and break ties by client order.
 */

export type AcceptEntry = { type: string; q: number; specificity: number }

export function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(',')
    .map((raw) => {
      const parts = raw
        .trim()
        .split(';')
        .map((s) => s.trim())
      const type = parts[0]?.toLowerCase()
      if (!type) return null
      let q = 1
      for (const param of parts.slice(1)) {
        const [name, value] = param.split('=').map((s) => s.trim())
        if (name === 'q') {
          const parsed = Number(value)
          if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed))
        }
      }
      const specificity = type === '*/*' ? 0 : type.endsWith('/*') ? 1 : 2
      return { type, q, specificity }
    })
    .filter((e): e is AcceptEntry => e !== null)
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === '*/*') return true
  if (entry.type.endsWith('/*')) return candidate.startsWith(entry.type.slice(0, -1))
  return entry.type === candidate
}

/** Pick the best representation from `produces`, or null when nothing matches. */
export function preferredType(header: string | null, produces: string[]): string | null {
  if (!header) return produces[0] ?? null
  const entries = parseAccept(header)
  if (entries.length === 0) return produces[0] ?? null

  let bestType: string | null = null
  let bestQ = -1
  let bestPosition = Infinity

  for (const candidate of produces) {
    let matched: AcceptEntry | null = null
    let matchedPosition = Infinity
    for (let idx = 0; idx < entries.length; idx++) {
      const e = entries[idx]!
      if (!matches(e, candidate)) continue
      if (
        matched === null ||
        e.specificity > matched.specificity ||
        (e.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = e
        matchedPosition = idx
      }
    }
    if (matched === null) continue
    if (matched.q <= 0) continue

    if (matched.q > bestQ || (matched.q === bestQ && matchedPosition < bestPosition)) {
      bestQ = matched.q
      bestPosition = matchedPosition
      bestType = candidate
    }
  }

  return bestType
}

export function wantsMarkdown(request: Request): boolean {
  return (
    preferredType(request.headers.get('accept'), ['text/html', 'text/markdown']) === 'text/markdown'
  )
}

/** Known agent crawlers that should receive Markdown even when Accept is HTML. */
const AGENT_UA =
  /(?:GPTBot|ClaudeBot|ChatGPT-User|Claude-User|PerplexityBot|Google-Extended|Applebot-Extended|ora-agent|DeepSeekBot|anthropic-ai|Bytespider)/i

export function isAgentUserAgent(ua: string | null): boolean {
  return Boolean(ua && AGENT_UA.test(ua))
}

export function appendVaryAccept(headers: Headers): void {
  const existing = headers.get('vary')
  if (!existing) {
    headers.set('Vary', 'Accept')
    return
  }
  const tokens = existing.split(',').map((s) => s.trim().toLowerCase())
  if (!tokens.includes('accept')) {
    headers.set('Vary', `${existing}, Accept`)
  }
}
