import { describe, expect, it } from 'vitest'
import { isAgentUserAgent, preferredType, wantsMarkdown } from './accept'

describe('preferredType', () => {
  it('prefers markdown when listed first', () => {
    expect(preferredType('text/markdown, text/html;q=0.8', ['text/html', 'text/markdown'])).toBe(
      'text/markdown',
    )
  })

  it('prefers html for typical browser Accept', () => {
    expect(
      preferredType('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', [
        'text/html',
        'text/markdown',
      ]),
    ).toBe('text/html')
  })

  it('returns null when every candidate is rejected', () => {
    expect(preferredType('text/html;q=0, text/markdown;q=0', ['text/html', 'text/markdown'])).toBe(
      null,
    )
  })

  it('defaults to the first produced type when Accept is missing', () => {
    expect(preferredType(null, ['text/html', 'text/markdown'])).toBe('text/html')
  })
})

describe('wantsMarkdown', () => {
  it('detects Accept: text/markdown', () => {
    const req = new Request('https://example.com/', {
      headers: { Accept: 'text/markdown' },
    })
    expect(wantsMarkdown(req)).toBe(true)
  })
})

describe('isAgentUserAgent', () => {
  it('recognizes common agent crawlers', () => {
    expect(isAgentUserAgent('ClaudeBot/1.0')).toBe(true)
    expect(isAgentUserAgent('Mozilla/5.0')).toBe(false)
  })
})
