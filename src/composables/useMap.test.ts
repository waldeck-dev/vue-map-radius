import { describe, it, expect } from 'vitest'
import { buildStyleUrl } from './useMap'

describe('buildStyleUrl', () => {
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
