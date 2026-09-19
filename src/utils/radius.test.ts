import { describe, it, expect } from 'vitest'
import { clampRadius, getValidationMessage } from './radius'

describe('clampRadius', () => {
  it('clamps to the minimum', () => {
    expect(clampRadius(2, 5, Infinity)).toBe(5)
  })

  it('clamps to the maximum', () => {
    expect(clampRadius(200, 0, 100)).toBe(100)
  })

  it('does not clamp when value is within range', () => {
    expect(clampRadius(50, 0, Infinity)).toBe(50)
  })
})

describe('getValidationMessage', () => {
  it('returns a minMessage when below the minimum', () => {
    expect(getValidationMessage(3, 10, Infinity)).toEqual({ key: 'radius.minMessage', params: { min: 10 } })
  })

  it('returns a maxMessage when above the maximum', () => {
    expect(getValidationMessage(100, 0, 50)).toEqual({ key: 'radius.maxMessage', params: { max: 50 } })
  })

  it('returns null when within range', () => {
    expect(getValidationMessage(42, 0, Infinity)).toBeNull()
  })
})
