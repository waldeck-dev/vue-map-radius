import type { GeoJSON } from 'geojson'
import { describe, it, expect } from 'vitest'
import { circleToPolygon, toGeoJSON, trimCoordPrecision, ramerDouglasPeucker, simplifyPolygon, haversineDistance, destinationPoint, circleBounds, getPolygonBounds } from '../utils/geo'

describe('circleToPolygon', () => {
  it('should return 64 points plus closing point by default', () => {
    const coords = circleToPolygon([0, 0], 10)
    expect(coords).toHaveLength(65)
  })

  it('should return correct number of points when specified', () => {
    const coords = circleToPolygon([0, 0], 10, 32)
    expect(coords).toHaveLength(33)
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

  it('should close the polygon (first and last must be equal)', () => {
    const coords = circleToPolygon([0, 0], 10)
    expect(coords[coords.length - 1]).toEqual(coords[0])
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
    expect(polygon.coordinates[0]).toHaveLength(65)

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
describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance([0, 0], [0, 0])).toBe(0)
  })

  it('returns ~111 km for 1 degree latitude', () => {
    const dist = haversineDistance([0, 0], [0, 1])
    expect(dist).toBeCloseTo(111.32, 0)
  })

  it('returns ~111 km for 1 degree longitude at equator', () => {
    const dist = haversineDistance([0, 0], [1, 0])
    expect(dist).toBeCloseTo(111.32, 0)
  })

  it('computes known distance Paris-London', () => {
    const paris = [2.35, 48.85]
    const london = [-0.12, 51.5]
    const dist = haversineDistance(paris, london)
    expect(dist).toBeGreaterThan(330)
    expect(dist).toBeLessThan(360)
  })

  it('is commutative', () => {
    const a = [10, 20]
    const b = [30, 40]
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6)
  })
})

describe('destinationPoint', () => {
  it('returns origin for 0 distance', () => {
    const result = destinationPoint([10, 20], 0, 90)
    expect(result[0]).toBeCloseTo(10, 8)
    expect(result[1]).toBeCloseTo(20, 8)
  })

  it('moves north (bearing 0) correctly', () => {
    const result = destinationPoint([0, 0], 111.32, 0)
    expect(result[0]).toBeCloseTo(0, 4)
    expect(result[1]).toBeCloseTo(1, 2)
  })

  it('moves east (bearing 90) correctly at equator', () => {
    const result = destinationPoint([0, 0], 111.32, 90)
    expect(result[0]).toBeCloseTo(1, 2)
    expect(result[1]).toBeCloseTo(0, 4)
  })

  it('is round-trip consistent with haversineDistance', () => {
    const origin = [10, 30]
    const dist = 500
    const dest = destinationPoint(origin, dist, 45)
    const roundTrip = haversineDistance(origin, dest)
    expect(roundTrip).toBeCloseTo(dist, 0)
  })
})

describe('getPolygonBounds', () => {
  it('returns null for null geometry', () => {
    const feature: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: null }
    expect(getPolygonBounds(feature)).toBeNull()
  })

  it('returns null for Point geometry', () => {
    const feature: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }
    expect(getPolygonBounds(feature)).toBeNull()
  })

  it('computes bbox for a Polygon', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
    }
    expect(getPolygonBounds(feature)).toEqual([0, 0, 10, 10])
  })

  it('computes bbox for a MultiPolygon', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature', properties: {},
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]], [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]]] },
    }
    expect(getPolygonBounds(feature)).toEqual([0, 0, 15, 15])
  })

  it('returns null for empty coordinates', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [[]] },
    }
    expect(getPolygonBounds(feature)).toBeNull()
  })
})

describe('circleBounds', () => {
  it('returns a point bbox for zero radius', () => {
    const bbox = circleBounds([2.35, 48.85], 0)
    expect(bbox[0]).toBeCloseTo(2.35, 8)
    expect(bbox[1]).toBeCloseTo(48.85, 8)
    expect(bbox[2]).toBeCloseTo(2.35, 8)
    expect(bbox[3]).toBeCloseTo(48.85, 8)
  })

  it('north-south span equals 2× radius in degrees at equator', () => {
    const bbox = circleBounds([0, 0], 111.32)
    expect(bbox[3] - bbox[1]).toBeCloseTo(2, 0)
  })

  it('north edge is at radius distance from center', () => {
    const center: [number, number] = [10, 30]
    const radius = 500
    const bbox = circleBounds(center, radius)
    const north: [number, number] = [center[0], bbox[3]]
    expect(haversineDistance(center, north)).toBeCloseTo(radius, -1)
  })

  it('bbox contains the center', () => {
    const bbox = circleBounds([2.35, 48.85], 100)
    expect(bbox[0]).toBeLessThan(2.35)
    expect(bbox[1]).toBeLessThan(48.85)
    expect(bbox[2]).toBeGreaterThan(2.35)
    expect(bbox[3]).toBeGreaterThan(48.85)
  })
})