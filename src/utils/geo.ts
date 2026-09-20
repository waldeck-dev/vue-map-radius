import type { GeoJSON } from 'geojson'

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const value = parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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

export function mergeToMultiPolygon(
  geometries: GeoJSON.Geometry[],
): GeoJSON.Feature | null {
  const coordinates: GeoJSON.Position[][][] = []

  for (const geometry of geometries) {
    if (geometry.type === 'Polygon') {
      coordinates.push(geometry.coordinates)
    } else if (geometry.type === 'MultiPolygon') {
      coordinates.push(...geometry.coordinates)
    }
  }

  if (coordinates.length === 0) return null

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
  }
}

export interface SplitOutlyingPartsOptions {
  /** Minimum distance (km) from the main landmass for a part to be considered outlying. */
  distanceKm?: number
  /** A part must be smaller than this fraction of the main landmass's area to be split off. */
  sizeRatio?: number
}

export interface SplitOutlyingPartsResult {
  main: GeoJSON.Geometry
  outliers: GeoJSON.Geometry[]
}

interface PolygonPart {
  polygon: GeoJSON.Polygon
  center: [number, number]
  /** Approximate area in km², used to compare a part's size to the main landmass. */
  size: number
}

// Shoelace formula on an equirectangular projection local to the ring's latitude.
// Good enough to compare landmass sizes; not a precise geodesic area.
function ringAreaKm2(ring: GeoJSON.Position[], refLat: number): number {
  const kmPerDegLat = 111.32
  const kmPerDegLng = 111.32 * Math.cos((refLat * Math.PI) / 180)
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[i + 1]
    sum += (lng1 * kmPerDegLng) * (lat2 * kmPerDegLat) - (lng2 * kmPerDegLng) * (lat1 * kmPerDegLat)
  }
  return Math.abs(sum) / 2
}

function polygonAreaKm2(polygon: GeoJSON.Polygon): number {
  const rings = polygon.coordinates
  if (rings.length === 0 || rings[0].length === 0) return 0
  const refLat = rings[0][0][1]
  const outer = ringAreaKm2(rings[0], refLat)
  const holes = rings.slice(1).reduce((sum, hole) => sum + ringAreaKm2(hole, refLat), 0)
  return Math.max(outer - holes, 0)
}

function toPart(coordinates: GeoJSON.Position[][]): PolygonPart {
  const polygon: GeoJSON.Polygon = { type: 'Polygon', coordinates }
  const bbox = getPolygonBounds(toGeoJSON(polygon))
  const center: [number, number] = bbox
    ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
    : ((coordinates[0]?.[0] as [number, number]) ?? [0, 0])
  const size = polygonAreaKm2(polygon)
  return { polygon, center, size }
}

function toPartGeometry(parts: PolygonPart[]): GeoJSON.Geometry {
  if (parts.length === 1) return parts[0].polygon
  return { type: 'MultiPolygon', coordinates: parts.map((p) => p.polygon.coordinates) }
}

function clusterByDistance(indices: number[], parts: PolygonPart[], thresholdKm: number): number[][] {
  const visited = new Set<number>()
  const clusters: number[][] = []
  for (const start of indices) {
    if (visited.has(start)) continue
    const stack = [start]
    const cluster: number[] = []
    visited.add(start)
    while (stack.length > 0) {
      const current = stack.pop()!
      cluster.push(current)
      for (const other of indices) {
        if (!visited.has(other) && haversineDistance(parts[current].center, parts[other].center) <= thresholdKm) {
          visited.add(other)
          stack.push(other)
        }
      }
    }
    clusters.push(cluster)
  }
  return clusters
}

/**
 * Splits a country/region's geometry into its main landmass and any small,
 * far-away parts (e.g. overseas territories, distant islands), so callers
 * can treat those as independent zones instead of one merged shape.
 * A part is only split off when it is BOTH far from the main landmass AND
 * much smaller than it — this keeps naturally scattered archipelagos
 * (e.g. Indonesia, Philippines) as a single "main" geometry.
 */
export function splitOutlyingParts(
  geometry: GeoJSON.Geometry,
  options: SplitOutlyingPartsOptions = {},
): SplitOutlyingPartsResult {
  const distanceKm = options.distanceKm ?? 400
  const sizeRatio = options.sizeRatio ?? 0.25

  if (geometry.type !== 'MultiPolygon' || geometry.coordinates.length <= 1) {
    return { main: geometry, outliers: [] }
  }

  const parts = geometry.coordinates.map(toPart)

  let mainIndex = 0
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].size > parts[mainIndex].size) mainIndex = i
  }
  const main = parts[mainIndex]

  const nearIndices = [mainIndex]
  const farIndices: number[] = []
  parts.forEach((part, i) => {
    if (i === mainIndex) return
    const isSmall = part.size < main.size * sizeRatio
    const isFar = haversineDistance(part.center, main.center) > distanceKm
    if (isSmall && isFar) {
      farIndices.push(i)
    } else {
      nearIndices.push(i)
    }
  })

  const mainGeometry = toPartGeometry(nearIndices.map((i) => parts[i]))
  const outliers = clusterByDistance(farIndices, parts, distanceKm)
    .map((indices) => toPartGeometry(indices.map((i) => parts[i])))

  return { main: mainGeometry, outliers }
}

/** Rounds a position, or any nesting of positions, without touching anything else. */
function trimPositions(value: unknown, factor: number): unknown {
  if (!Array.isArray(value)) return value
  if (typeof value[0] === 'number') {
    const position = new Array(value.length)
    for (let i = 0; i < value.length; i++) {
      position[i] = Math.round((value[i] as number) * factor) / factor
    }
    return position
  }
  return value.map((entry) => trimPositions(entry, factor))
}

function trimNode(node: Record<string, unknown>, factor: number): Record<string, unknown> {
  const trimmed: Record<string, unknown> = { ...node }
  if (Array.isArray(node.bbox)) trimmed.bbox = trimPositions(node.bbox, factor)

  switch (node.type) {
    case 'FeatureCollection':
      trimmed.features = (node.features as Record<string, unknown>[]).map((f) => trimNode(f, factor))
      return trimmed
    case 'Feature':
      if (node.geometry) trimmed.geometry = trimNode(node.geometry as Record<string, unknown>, factor)
      return trimmed
    case 'GeometryCollection':
      trimmed.geometries = (node.geometries as Record<string, unknown>[]).map((g) => trimNode(g, factor))
      return trimmed
    default:
      if ('coordinates' in node) trimmed.coordinates = trimPositions(node.coordinates, factor)
      return trimmed
  }
}

/**
 * Rounds every coordinate to `decimals` places. Walks the GeoJSON structure
 * rather than cloning it wholesale, so `properties` are left untouched.
 */
export function trimCoordPrecision<T extends GeoJSON.GeoJSON | GeoJSON.Geometry | GeoJSON.Feature>(
  geojson: T,
  decimals: number = 6,
): T {
  return trimNode(geojson as unknown as Record<string, unknown>, 10 ** decimals) as unknown as T
}

/**
 * Marks the points to keep between `lo` and `hi`. Compares squared distances
 * against a squared tolerance, so the hot loop needs no square root, and walks
 * index ranges of the original array instead of slicing it at every split.
 */
function keepFurthestPoints(
  points: [number, number][],
  lo: number,
  hi: number,
  toleranceSq: number,
  keep: Uint8Array,
): void {
  if (hi - lo < 2) return

  const ax = points[lo][0]
  const ay = points[lo][1]
  const dx = points[hi][0] - ax
  const dy = points[hi][1] - ay
  const segmentSq = dx * dx + dy * dy
  const cross = points[hi][0] * ay - points[hi][1] * ax

  let maxSq = -1
  let maxIdx = -1
  for (let i = lo + 1; i < hi; i++) {
    const px = points[i][0]
    const py = points[i][1]
    let distSq
    if (segmentSq === 0) {
      const ex = px - ax
      const ey = py - ay
      distSq = ex * ex + ey * ey
    } else {
      const numerator = dy * px - dx * py + cross
      distSq = (numerator * numerator) / segmentSq
    }
    if (distSq > maxSq) {
      maxSq = distSq
      maxIdx = i
    }
  }

  if (maxIdx >= 0 && maxSq > toleranceSq) {
    keep[maxIdx] = 1
    keepFurthestPoints(points, lo, maxIdx, toleranceSq, keep)
    keepFurthestPoints(points, maxIdx, hi, toleranceSq, keep)
  }
}

export function ramerDouglasPeucker(
  points: [number, number][],
  tolerance: number,
): [number, number][] {
  const count = points.length
  if (count <= 2) return points

  const keep = new Uint8Array(count)
  keep[0] = 1
  keep[count - 1] = 1
  keepFurthestPoints(points, 0, count - 1, tolerance < 0 ? -1 : tolerance * tolerance, keep)

  const simplified: [number, number][] = []
  for (let i = 0; i < count; i++) {
    if (keep[i]) simplified.push(points[i])
  }
  return simplified
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

const polygonBoundsCache = new WeakMap<GeoJSON.Feature<GeoJSON.Geometry | null>, [number, number, number, number]>()

export function getPolygonBounds(feature: GeoJSON.Feature<GeoJSON.Geometry | null>): [number, number, number, number] | null {
  const cached = polygonBoundsCache.get(feature)
  if (cached) return cached
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
  const result: [number, number, number, number] = [minLng, minLat, maxLng, maxLat]
  polygonBoundsCache.set(feature, result)
  return result
}

export function circleBounds(
  center: [number, number],
  radiusKm: number,
): [number, number, number, number] {
  const n = destinationPoint(center, radiusKm, 0)
  const e = destinationPoint(center, radiusKm, 90)
  const s = destinationPoint(center, radiusKm, 180)
  const w = destinationPoint(center, radiusKm, 270)

  const wrap = (lng: number) => {
    const r = lng % 360
    return r > 180 ? r - 360 : r < -180 ? r + 360 : r
  }

  return [wrap(w[0]), s[1], wrap(e[0]), n[1]]
}
