import { describe, expect, it } from 'vitest'
import { isSpaRoute, normalizePath } from './site'

describe('normalizePath', () => {
  it('collapses trailing slashes', () => {
    expect(normalizePath('/docs/')).toBe('/docs')
    expect(normalizePath('/')).toBe('/')
  })
})

describe('isSpaRoute', () => {
  it('allows known public and app routes', () => {
    expect(isSpaRoute('/')).toBe(true)
    expect(isSpaRoute('/developers')).toBe(true)
    expect(isSpaRoute('/apply/hacker')).toBe(true)
    expect(isSpaRoute('/admin/applications/abc')).toBe(true)
  })

  it('rejects unknown paths', () => {
    expect(isSpaRoute('/some-path-that-does-not-exist')).toBe(false)
    expect(isSpaRoute('/llms.txt')).toBe(false)
  })
})
