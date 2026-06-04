import { describe, it, expect } from 'vitest'
import { useRadius } from './useRadius'

describe('useRadius', () => {
  it('has a default radius of 10 km', () => {
    const { radiusKm } = useRadius(0, Infinity)
    expect(radiusKm.value).toBe(10)
  })

  it('clamps radius to the minimum on blur', () => {
    const { setRadius, clamp, radiusKm } = useRadius(5, Infinity)
    setRadius(2)
    clamp()
    expect(radiusKm.value).toBe(5)
  })

  it('clamps radius to the maximum on blur', () => {
    const { setRadius, clamp, radiusKm } = useRadius(0, 100)
    setRadius(200)
    clamp()
    expect(radiusKm.value).toBe(100)
  })

  it('does not clamp when value is within range', () => {
    const { setRadius, clamp, radiusKm } = useRadius(0, Infinity)
    setRadius(50)
    clamp()
    expect(radiusKm.value).toBe(50)
  })

  it('sets center coordinates', () => {
    const { setCenter, center } = useRadius(0, Infinity)
    setCenter([2.35, 48.86])
    expect(center.value).toEqual([2.35, 48.86])
  })

  it('clampedRadius computed property reflects min constraint', () => {
    const { setRadius, clampedRadius } = useRadius(10, Infinity)
    setRadius(3)
    expect(clampedRadius.value).toBe(10)
  })

  it('clampedRadius computed property reflects max constraint', () => {
    const { setRadius, clampedRadius } = useRadius(0, 50)
    setRadius(100)
    expect(clampedRadius.value).toBe(50)
  })

  it('clampedRadius equals actual radius when within range', () => {
    const { setRadius, clampedRadius } = useRadius(0, Infinity)
    setRadius(42)
    expect(clampedRadius.value).toBe(42)
  })
})