import type { GeoJSON } from 'geojson'
import { describe, it, expect } from 'vitest'
import { useGeoJSON } from './useGeoJSON'

describe('useGeoJSON', () => {
  it('should trim precision with default decimals', () => {
    const { trimPrecision } = useGeoJSON({ coordPrecision: 3 })
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1.234567, 2.345678] }
    const result = trimPrecision(point)
    expect(result.coordinates).toEqual([1.235, 2.346])
  })

  it('should trim precision with explicit decimals override', () => {
    const { trimPrecision } = useGeoJSON({ coordPrecision: 3 })
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1.234567, 2.345678] }
    const result = trimPrecision(point, 1)
    expect(result.coordinates).toEqual([1.2, 2.3])
  })

  it('should default to 6 decimals when no option set', () => {
    const { trimPrecision } = useGeoJSON()
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1.123456789, 2.987654321] }
    const result = trimPrecision(point)
    expect(result.coordinates).toEqual([1.123457, 2.987654])
  })

  it('should not simplify when simplifyTolerance is not set', () => {
    const { simplify } = useGeoJSON()
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    }
    const result = simplify(feature)
    expect(result).toBe(feature)
  })

  it('should simplify when simplifyTolerance is set', () => {
    const { simplify } = useGeoJSON({ simplifyTolerance: 0.01 })
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    }
    const result = simplify(feature)
    const geom = result.geometry as GeoJSON.Polygon
    expect(geom.coordinates[0].length).toBeLessThan(6)
  })

  it('should use explicit tolerance override', () => {
    const { simplify } = useGeoJSON({ simplifyTolerance: 10 })
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    }
    const result = simplify(feature, 0.01)
    const geom = result.geometry as GeoJSON.Polygon
    expect(geom.coordinates[0].length).toBeLessThan(6)
  })
})