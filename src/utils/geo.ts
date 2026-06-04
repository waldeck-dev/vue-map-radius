import type { GeoJSON } from 'geojson'

export function circleToPolygon(
  center: [number, number],
  radiusKm: number,
  points: number = 64,
): [number, number][] {
  const [lng, lat] = center
  const kmPerDegree = 111.32
  const latRad = (lat * Math.PI) / 180
  const lngKmPerDegree = kmPerDegree * Math.cos(latRad)

  const coordinates: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 360
    const angleRad = (angle * Math.PI) / 180
    const dx = radiusKm * Math.sin(angleRad)
    const dy = radiusKm * Math.cos(angleRad)
    const newLng = lng + dx / lngKmPerDegree
    const newLat = lat + dy / kmPerDegree
    coordinates.push([newLng, newLat])
  }

  return coordinates
}

export function toGeoJSON(
  geometry: [number, number][][] | GeoJSON.Geometry,
): GeoJSON.Feature {
  if (Array.isArray(geometry)) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: geometry,
      },
    }
  }

  return {
    type: 'Feature',
    properties: {},
    geometry,
  }
}
