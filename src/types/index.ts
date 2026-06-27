import type { GeoJSON } from 'geojson'

export type Mode = 'radius' | 'polygon'

export interface MapRadiusState {
  mode: Mode
  center: [number, number] | null
  radiusKm: number
  polygon: GeoJSON.Feature | null
  name: string | null
  bearing?: number
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
}

export interface MapRadiusInteractiveOptions {
  draggableCenter?: boolean
  draggableRadius?: boolean
  showRadiusTooltip?: boolean
}
