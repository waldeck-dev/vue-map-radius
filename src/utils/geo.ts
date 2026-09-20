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

const EARTH_RADIUS_KM = 6371

/** Normalises a longitude into [-180, 180]. */
function wrapLongitude(lng: number): number {
  const wrapped = lng % 360
  return wrapped > 180 ? wrapped - 360 : wrapped < -180 ? wrapped + 360 : wrapped
}

/**
 * A true small circle on the sphere: every vertex is `radiusKm` away from the
 * centre, measured the same way haversineDistance measures it. An
 * equirectangular approximation drifts with latitude — at 70°N a 300 km circle
 * comes out between 292 and 307 km wide — which made the drawn circle disagree
 * with the radius the UI reported.
 */
export function circleToPolygon(
  center: [number, number],
  radiusKm: number,
  points: number = 64,
): [number, number][] {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) return []
  const segments = Math.max(3, Math.floor(points))
  const lngRad = (center[0] * Math.PI) / 180
  const latRad = (center[1] * Math.PI) / 180
  const angular = radiusKm / EARTH_RADIUS_KM
  const sinD = Math.sin(angular)
  const cosD = Math.cos(angular)
  const sinLat = Math.sin(latRad)
  const cosLat = Math.cos(latRad)

  const coordinates: [number, number][] = []
  for (let i = 0; i < segments; i++) {
    const bearing = (i / segments) * 2 * Math.PI
    const sinLat2 = sinLat * cosD + cosLat * sinD * Math.cos(bearing)
    const lat2 = Math.asin(sinLat2)
    const lng2 = lngRad + Math.atan2(Math.sin(bearing) * sinD * cosLat, cosD - sinLat * sinLat2)
    coordinates.push([wrapLongitude((lng2 * 180) / Math.PI), (lat2 * 180) / Math.PI])
  }

  coordinates.push([coordinates[0][0], coordinates[0][1]])
  return coordinates
}

/**
 * Initial great-circle bearing in degrees from `from` to `to`, the inverse of
 * destinationPoint. Taking atan2 of raw degree deltas instead treats one degree
 * of longitude as one degree of latitude, which is wrong everywhere but the
 * equator.
 */
export function bearingTo(from: [number, number], to: [number, number]): number {
  const lat1 = (from[1] * Math.PI) / 180
  const lat2 = (to[1] * Math.PI) / 180
  const dLng = ((to[0] - from[0]) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
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
  main: GeoJSON.Polygon | GeoJSON.MultiPolygon
  outliers: (GeoJSON.Polygon | GeoJSON.MultiPolygon)[]
}

interface PolygonPart {
  polygon: GeoJSON.Polygon
  center: [number, number]
  /** Approximate area in km², used to compare a part's size to the main landmass. */
  size: number
}

/**
 * Spherical excess (Chamberlain & Duquette), not a scaled planar shoelace.
 * A shoelace sum only cancels its baseline when every term shares one scale
 * factor, so folding a per-edge cos(lat) into it makes the result depend on
 * where the equator is: metropolitan France came out eight times too small,
 * and its overseas départements then looked too big to split off.
 */
function ringAreaKm2(ring: GeoJSON.Position[]): number {
  if (ring.length < 4) return 0
  const toRad = Math.PI / 180
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[i + 1]
    sum += wrapLongitude(lng2 - lng1) * toRad * (2 + Math.sin(lat1 * toRad) + Math.sin(lat2 * toRad))
  }
  return Math.abs((sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2)
}

function polygonAreaKm2(polygon: GeoJSON.Polygon): number {
  const rings = polygon.coordinates
  if (rings.length === 0 || rings[0].length === 0) return 0
  const outer = ringAreaKm2(rings[0])
  const holes = rings.slice(1).reduce((sum, hole) => sum + ringAreaKm2(hole), 0)
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

function toPartGeometry(parts: PolygonPart[]): GeoJSON.Polygon | GeoJSON.MultiPolygon {
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
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
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

/**
 * Simplifies one ring, or returns an empty ring when nothing of it survives.
 * An island smaller than the tolerance collapses to two points, which closing
 * turns into a zero-area triangle — better to drop it than to ship a sliver.
 */
function simplifyRing(
  ring: [number, number][],
  tolerance: number,
): [number, number][] {
  if (ring.length <= 3 || tolerance <= 0) return ring
  const isClosed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  const points = isClosed ? ring.slice(0, -1) : ring
  const simplified = ramerDouglasPeucker(points, tolerance)
  if (simplified.length < 3) return []
  if (isClosed) {
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
    const rings = simplifyRings(polygon.coordinates as [number, number][][], tolerance)
    if (rings.length === 0) return feature
    return { ...feature, geometry: { type: 'Polygon', coordinates: rings } }
  }

  if (geom.type === 'MultiPolygon') {
    const multi = geom as GeoJSON.MultiPolygon
    const polygons = multi.coordinates
      .map((polygon) => simplifyRings(polygon as [number, number][][], tolerance))
      .filter((polygon) => polygon.length > 0)
    if (polygons.length === 0) return feature
    return { ...feature, geometry: { type: 'MultiPolygon', coordinates: polygons } }
  }

  return feature
}

/** Simplifies a polygon's rings, dropping the whole polygon if its outer ring vanishes. */
function simplifyRings(rings: [number, number][][], tolerance: number): [number, number][][] {
  const simplified = rings.map((ring) => simplifyRing(ring, tolerance))
  if (simplified.length === 0 || simplified[0].length === 0) return []
  return simplified.filter((ring) => ring.length > 0)
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

/**
 * Bounding box `[west, south, east, north]` of a Polygon or MultiPolygon.
 *
 * Longitudes are unwrapped as the ring is walked, so a shape crossing the
 * anti-meridian (Russia, Fiji, New Zealand) yields a box that crosses it too —
 * `west > east` — instead of the whole-globe box a naive min/max produces.
 * Callers that hand the result to a map must understand that convention;
 * `circleBounds` has always used it.
 */
export function getPolygonBounds(feature: GeoJSON.Feature<GeoJSON.Geometry | null>): [number, number, number, number] | null {
  const geometry = feature.geometry
  if (!geometry) return null

  const rings: GeoJSON.Position[][] = geometry.type === 'Polygon'
    ? [geometry.coordinates[0]]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.map((polygon) => polygon[0])
      : []
  if (rings.length === 0) return null

  let anchor: number | null = null
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity

  for (const ring of rings) {
    if (!ring || ring.length === 0) continue
    // Anchor each ring within half a turn of the first one, then follow the
    // ring vertex by vertex so a 179 -> -179 step counts as +2, not -358.
    let unwrapped: number = anchor === null ? ring[0][0] : anchor + wrapLongitude(ring[0][0] - anchor)
    if (anchor === null) anchor = unwrapped
    let previous = ring[0][0]

    for (let i = 0; i < ring.length; i++) {
      if (i > 0) {
        unwrapped += wrapLongitude(ring[i][0] - previous)
        previous = ring[i][0]
      }
      const lat = ring[i][1]
      if (unwrapped < minLng) minLng = unwrapped
      if (unwrapped > maxLng) maxLng = unwrapped
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }

  if (minLng === Infinity) return null
  if (maxLng - minLng >= 360) return [-180, minLat, 180, maxLat]
  return [wrapLongitude(minLng), minLat, wrapLongitude(maxLng), maxLat]
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
