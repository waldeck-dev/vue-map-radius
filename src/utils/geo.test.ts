import type { GeoJSON } from 'geojson'
import { describe, it, expect } from 'vitest'
import { circleToPolygon, toGeoJSON } from '../utils/geo'

describe('circleToPolygon', () => {
  it('should return 64 points by default', () => {
    const coords = circleToPolygon([0, 0], 10)
    expect(coords).toHaveLength(64)
  })

  it('should return correct number of points when specified', () => {
    const coords = circleToPolygon([0, 0], 10, 32)
    expect(coords).toHaveLength(32)
  })

  it('should produce valid [lng, lat] pairs', () => {
    const coords = circleToPolygon([2.35, 48.85], 5)
    for (const [lng, lat] of coords) {
      expect(typeof lng).toBe('number')
      expect(typeof lat).toBe('number')
      expect(lng).not.toBeNaN()
      expect(lat).not.toBeNaN()
    }
  })

  it('should close the polygon (first and last should be near)', () => {
    const coords = circleToPolygon([0, 0], 10)
    const first = coords[0]
    const last = coords[coords.length - 1]
    expect(Math.abs(first[0] - last[0])).toBeLessThan(0.01)
    expect(Math.abs(first[1] - last[1])).toBeLessThan(0.01)
  })

  it('should handle zero radius', () => {
    const coords = circleToPolygon([0, 0], 0)
    for (const [lng, lat] of coords) {
      expect(lng).toBeCloseTo(0, 8)
      expect(lat).toBeCloseTo(0, 8)
    }
  })
})

describe('toGeoJSON', () => {
  it('should convert coordinate array to Polygon Feature', () => {
    const coords = circleToPolygon([0, 0], 10)
    const feature = toGeoJSON([coords])
    expect(feature.type).toBe('Feature')
    expect(feature.geometry.type).toBe('Polygon')
    const polygon = feature.geometry as GeoJSON.Polygon
    expect(polygon.coordinates).toHaveLength(1)
    expect(polygon.coordinates[0]).toHaveLength(64)

  })

  it('should pass through a GeoJSON geometry object', () => {
    const geometry = { type: 'Point' as const, coordinates: [1, 2] }
    const feature = toGeoJSON(geometry)
    expect(feature.type).toBe('Feature')
    expect(feature.geometry.type).toBe('Point')
    const point = feature.geometry as GeoJSON.Point
    expect(point.coordinates).toEqual([1, 2])
  })
})
