import type { GeoJSON } from 'geojson'

export type Mode = 'radius' | 'polygon'

export interface MapRadiusZone {
  id: string
  name: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  /** Hex color (e.g. "#3b82f6") assigned to this zone, used on the map and the zone chip. */
  color?: string
}

export interface MapRadiusCircleZone {
  id: string
  name: string | null
  center: [number, number]
  radiusKm: number
  /** Hex color (e.g. "#3b82f6") assigned to this circle, used on the map and the zone chip. */
  color?: string
  /** Bearing of the radius handle in degrees, so its position survives a round trip. */
  bearing?: number
}

export interface MapRadiusRadiusState {
  mode: 'radius'
  circles: MapRadiusCircleZone[]
  selectedCircleId?: string | null
}

export interface MapRadiusPolygonState {
  mode: 'polygon'
  zones: MapRadiusZone[]
  /** Where to centre the map when a search result turned out to have no polygon. */
  center?: [number, number] | null
}

/**
 * Everything the component needs to restore itself, and nothing else:
 * `hydrate(emitted)` reproduces the state it was emitted from. The merged
 * geometry that used to travel in this object is derived output — read it from
 * the `geometry` event or from `getGeometry()` on the component instance.
 */
export type MapRadiusState = MapRadiusRadiusState | MapRadiusPolygonState

/** The merged shape of everything currently drawn, emitted as derived output. */
export interface MapRadiusGeometry {
  feature: GeoJSON.Feature<GeoJSON.MultiPolygon> | null
  name: string | null
}

export interface MapRadiusError {
  source: 'config' | 'geocoding-search' | 'geocoding-detail'
  message: string
  cause?: unknown
}

export interface GeocodingResult {
  id: string
  text: string
  placeName: string
  center: [number, number]
  bbox?: [number, number, number, number]
  type: string
  geometry?: GeoJSON.Geometry
}

export interface MapTilerFeature {
  id: string
  type: 'Feature'
  place_type: string[]
  text: string
  place_name: string
  center: [number, number]
  bbox?: [number, number, number, number]
  geometry?: GeoJSON.Geometry
  properties: Record<string, unknown>
  matching_text?: string
  relevance?: number
}

export interface MapTilerGeocodingResponse {
  type: 'FeatureCollection'
  features: MapTilerFeature[]
}

export interface MapRadiusSearchOptions {
  placeholder?: string
  noResultsText?: string
  loadingText?: string
}

export interface MapRadiusRadiusOptions {
  label?: string
}

export interface MapRadiusModeToggleOptions {
  radiusLabel?: string
  polygonLabel?: string
}

export interface MapRadiusMapOptions {
  style?: string
}

export interface MapRadiusGeoOptions {
  coordPrecision?: number
  simplifyTolerance?: number
  /** Automatically split a selected zone's far, small parts (e.g. overseas territories) into their own zones. Default: true. */
  splitOutlyingTerritories?: boolean
  /** Minimum distance (km) from the main landmass for a part to be considered outlying. Default: 400. */
  outlyingDistanceKm?: number
  /** A part must be smaller than this fraction of the main landmass's area to be split off. Default: 0.25. */
  outlyingSizeRatio?: number
}

export interface MapRadiusPaintOptions {
  circleColor?: string
  circleOpacity?: number
  circleOutlineColor?: string
  circleOutlineWidth?: number
  polygonColor?: string
  polygonOpacity?: number
  polygonOutlineColor?: string
  polygonOutlineWidth?: number
  centerMarkerColor?: string
  radiusHandleColor?: string
  radiusTooltipColor?: string
  /** Hex color palette cycled through as zones are added (e.g. ['#3b82f6', '#ef4444']). */
  zoneColors?: string[]
}

export interface MapRadiusInteractiveOptions {
  draggableCenter?: boolean
  draggableRadius?: boolean
  showRadiusTooltip?: boolean
}

export interface MapRadiusZoneListOptions {
  removeLabel?: string
  loadingLabel?: string
}
