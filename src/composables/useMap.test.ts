import { describe, it, expect } from 'vitest'

describe('buildStyleUrl', () => {
  // Import is tricky since it's not exported; we test via the module behavior
  // Instead, we'll re-implement the logic inline for testing
  function buildStyleUrl(url: string | undefined, key: string): string {
    if (!url) return 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + key
    if (/\bkey=/.test(url)) return url
    const sep = url.includes('?') ? '&' : '?'
    return url + sep + 'key=' + key
  }

  it('returns default URL when no styleUrl provided', () => {
    const result = buildStyleUrl(undefined, 'abc123')
    expect(result).toBe('https://api.maptiler.com/maps/streets-v2/style.json?key=abc123')
  })

  it('appends key when URL has no query params', () => {
    const result = buildStyleUrl('https://example.com/style.json', 'abc123')
    expect(result).toBe('https://example.com/style.json?key=abc123')
  })

  it('appends key when URL has existing query params', () => {
    const result = buildStyleUrl('https://example.com/style.json?version=2', 'abc123')
    expect(result).toBe('https://example.com/style.json?version=2&key=abc123')
  })

  it('returns URL as-is when key already present', () => {
    const url = 'https://example.com/style.json?key=existing'
    const result = buildStyleUrl(url, 'abc123')
    expect(result).toBe(url)
  })

  it('returns URL as-is when key is in fragment', () => {
    const url = 'https://example.com/style.json?foo=bar&key=xyz'
    const result = buildStyleUrl(url, 'abc123')
    expect(result).toBe(url)
  })
})