import type { GeoJSON } from 'geojson'
import { describe, it, expect } from 'vitest'
import { circleToPolygon, toGeoJSON, trimCoordPrecision, ramerDouglasPeucker, simplifyPolygon } from '../utils/geo'

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

describe('trimCoordPrecision', () => {
  it('should round Point coordinates', () => {
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1.23456789, 2.3456789] }
    const result = trimCoordPrecision(point, 3)
    expect(result.coordinates).toEqual([1.235, 2.346])
  })

  it('should round Polygon ring coordinates', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[1.23456789, 2.3456789], [3.45678901, 4.56789012], [1.23456789, 2.3456789]]],
    }
    const result = trimCoordPrecision(polygon, 2)
    expect(result.coordinates[0][0]).toEqual([1.23, 2.35])
    expect(result.coordinates[0][1]).toEqual([3.46, 4.57])
  })

  it('should round Feature coordinates', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [1.23456789, 2.3456789] },
    }
    const result = trimCoordPrecision(feature, 4)
    const geom = result.geometry as GeoJSON.Point
    expect(geom.coordinates).toEqual([1.2346, 2.3457])
  })

  it('should default to 6 decimal places', () => {
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1.123456789, 2.987654321] }
    const result = trimCoordPrecision(point)
    expect(result.coordinates).toEqual([1.123457, 2.987654])
  })

  it('should handle MultiPolygon', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [[[[1.23456789, 2.3456789], [3.45678901, 4.56789012], [1.23456789, 2.3456789]]]],
    }
    const result = trimCoordPrecision(multi, 1)
    expect(result.coordinates[0][0][0]).toEqual([1.2, 2.3])
  })
})

describe('ramerDouglasPeucker', () => {
  it('should return the same points if length <= 2', () => {
    const points: [number, number][] = [[0, 0], [1, 1]]
    expect(ramerDouglasPeucker(points, 0.5)).toEqual(points)
  })

  it('should remove collinear points', () => {
    const points: [number, number][] = [[0, 0], [0.5, 0.5], [1, 1]]
    const result = ramerDouglasPeucker(points, 0.1)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([0, 0])
    expect(result[1]).toEqual([1, 1])
  })

  it('should keep points that deviate beyond tolerance', () => {
    const points: [number, number][] = [[0, 0], [0.5, 0.8], [1, 0]]
    const result = ramerDouglasPeucker(points, 0.1)
    expect(result).toHaveLength(3)
  })

  it('should simplify a straight line with many points', () => {
    const points: [number, number][] = []
    for (let i = 0; i <= 20; i++) {
      points.push([i, 0])
    }
    const result = ramerDouglasPeucker(points, 0.01)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([0, 0])
    expect(result[1]).toEqual([20, 0])
  })

  it('should handle single point', () => {
    const points: [number, number][] = [[5, 5]]
    expect(ramerDouglasPeucker(points, 0.1)).toEqual(points)
  })
})

describe('simplifyPolygon', () => {
  it('should simplify a polygon with redundant vertices', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0.5, 0], [1, 0], [1, 1], [0.5, 1], [0, 1], [0, 0]]],
      },
    }
    const result = simplifyPolygon(feature, 0.01)
    const geom = result.geometry as GeoJSON.Polygon
    expect(geom.coordinates[0].length).toBeLessThan(7)
  })

  it('should preserve the last closing point', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    }
    const result = simplifyPolygon(feature, 0.01)
    const geom = result.geometry as GeoJSON.Polygon
    const ring = geom.coordinates[0]
    expect(ring[ring.length - 1]).toEqual(ring[0])
  })

  it('should not change feature with tolerance = 0', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: { name: 'test' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    }
    const result = simplifyPolygon(feature, 0)
    expect(result).toEqual(feature)
  })

  it('should handle MultiPolygon', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]],
      },
    }
    const result = simplifyPolygon(feature, 0.01)
    const geom = result.geometry as GeoJSON.MultiPolygon
    const ring = geom.coordinates[0][0]
    expect(ring[ring.length - 1]).toEqual(ring[0])
  })
})