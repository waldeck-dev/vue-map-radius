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

  coordinates.push([coordinates[0][0], coordinates[0][1]])
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

function trimCoords(value: unknown, decimals: number): unknown {
  if (typeof value === 'number') {
    return Number(value.toFixed(decimals))
  }
  if (Array.isArray(value)) {
    return value.map((v) => trimCoords(v, decimals))
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = trimCoords((value as Record<string, unknown>)[key], decimals)
    }
    return result
  }
  return value
}

export function trimCoordPrecision<T extends GeoJSON.GeoJSON | GeoJSON.Geometry | GeoJSON.Feature>(
  geojson: T,
  decimals: number = 6,
): T {
  return trimCoords(geojson, decimals) as T
}

function perpendicularDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const numerator = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0])
  const denominator = Math.sqrt(dx * dx + dy * dy)
  if (denominator === 0) {
    return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
  }
  return numerator / denominator
}

export function ramerDouglasPeucker(
  points: [number, number][],
  tolerance: number,
): [number, number][] {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last)
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }

  if (maxDist > tolerance) {
    const left = ramerDouglasPeucker(points.slice(0, maxIdx + 1), tolerance)
    const right = ramerDouglasPeucker(points.slice(maxIdx), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

function simplifyRing(
  ring: [number, number][],
  tolerance: number,
): [number, number][] {
  if (ring.length <= 3) return ring
  const isClosed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  const points = isClosed ? ring.slice(0, -1) : ring
  const simplified = ramerDouglasPeucker(points, tolerance)
  if (isClosed && simplified.length > 0) {
    simplified.push([simplified[0][0], simplified[0][1]])
  }
  return simplified
}

export function simplifyPolygon(
  feature: GeoJSON.Feature,
  tolerance: number,
): GeoJSON.Feature {
  const geom = feature.geometry
  if (!geom) return feature

  if (geom.type === 'Polygon') {
    const polygon = geom as GeoJSON.Polygon
    return {
      ...feature,
      geometry: {
        type: 'Polygon',
        coordinates: polygon.coordinates.map(
          (ring) => simplifyRing(ring as [number, number][], tolerance),
        ),
      },
    }
  }

  if (geom.type === 'MultiPolygon') {
    const multi = geom as GeoJSON.MultiPolygon
    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: multi.coordinates.map((polygon) =>
          polygon.map((ring) => simplifyRing(ring as [number, number][], tolerance)),
        ),
      },
    }
  }

  return feature
}

export function haversineDistance(
  a: [number, number],
  b: [number, number],
): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const haversineA =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA))
}

export function destinationPoint(
  origin: [number, number],
  distanceKm: number,
  bearingDeg: number,
): [number, number] {
  const [lng, lat] = origin
  const R = 6371
  const d = distanceKm / R
  const brng = (bearingDeg * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(brng),
  )
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(newLatRad),
    )
  return [(newLngRad * 180) / Math.PI, (newLatRad * 180) / Math.PI]
}

export function getPolygonBounds(feature: GeoJSON.Feature): [number, number, number, number] | null {
  if (!feature.geometry) return null
  const coords: [number, number][] = []
  const g = feature.geometry
  if (g.type === 'Polygon') {
    g.coordinates[0].forEach((c) => coords.push(c as [number, number]))
  } else if (g.type === 'MultiPolygon') {
    g.coordinates.forEach((poly) => poly[0].forEach((c) => coords.push(c as [number, number])))
  } else {
    return null
  }
  if (coords.length === 0) return null
  let minLng = coords[0][0], minLat = coords[0][1], maxLng = coords[0][0], maxLat = coords[0][1]
  for (let i = 1; i < coords.length; i++) {
    if (coords[i][0] < minLng) minLng = coords[i][0]
    if (coords[i][0] > maxLng) maxLng = coords[i][0]
    if (coords[i][1] < minLat) minLat = coords[i][1]
    if (coords[i][1] > maxLat) maxLat = coords[i][1]
  }
  return [minLng, minLat, maxLng, maxLat]
}

export function circleBounds(
  center: [number, number],
  radiusKm: number,
): [number, number, number, number] {
  const n = destinationPoint(center, radiusKm, 0)
  const e = destinationPoint(center, radiusKm, 90)
  const s = destinationPoint(center, radiusKm, 180)
  const w = destinationPoint(center, radiusKm, 270)
  return [w[0], s[1], e[0], n[1]]
}
