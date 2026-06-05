import { trimCoordPrecision, simplifyPolygon } from '../utils/geo'
import type { GeoJSON } from 'geojson'

export function useGeoJSON(options?: {
  coordPrecision?: number
  simplifyTolerance?: number
}) {
  function trimPrecision<T extends GeoJSON.GeoJSON | GeoJSON.Feature | GeoJSON.Geometry>(
    geojson: T,
    decimals?: number,
  ): T {
    return trimCoordPrecision(geojson, decimals ?? options?.coordPrecision ?? 6)
  }

  function simplify(feature: GeoJSON.Feature, tolerance?: number): GeoJSON.Feature {
    const tol = tolerance ?? options?.simplifyTolerance
    if (tol == null) return feature
    return simplifyPolygon(feature, tol)
  }

  return { trimPrecision, simplify }
}