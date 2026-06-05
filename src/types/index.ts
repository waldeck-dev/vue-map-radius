import type { GeoJSON } from 'geojson'

export type Mode = 'radius' | 'polygon'

export interface MapRadiusProps {
  apiKey: string
  center?: [number, number]
  zoom?: number
  minRadius?: number
  maxRadius?: number
  radiusStep?: number
  mode?: Mode
  height?: string
  locale?: string
  translations?: Record<string, Record<string, string>>
}

export interface SearchBarProps {
  modelValue: string
  placeholder: string
  results: GeocodingResult[]
  loading: boolean
}

export interface ModeToggleProps {
  mode: Mode
  radiusLabel: string
  polygonLabel: string
}

export interface RadiusInputProps {
  modelValue: number
  label: string
  minMessage?: string
  maxMessage?: string
}

export interface ConfirmButtonProps {
  label: string
  loading?: boolean
  disabled?: boolean
}

export interface MapContainerProps {
  apiKey: string
  center: [number, number]
  zoom: number
  height: string
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

export interface TranslationMap {
  [key: string]: Record<string, string>
}

export interface CircleState {
  center: [number, number] | null
  radiusKm: number
}

export interface PolygonState {
  feature: GeoJSON.Feature | null
  name: string | null
}

export interface MapInstanceState {
  map: maplibregl.Map | null
  circleSource: string
  circleFillLayer: string
  circleLineLayer: string
  polygonSource: string
  polygonFillLayer: string
  polygonLineLayer: string
}

export interface MapRadiusSearchOptions {
  placeholder?: string
  noResultsText?: string
  loadingText?: string
}

export interface MapRadiusRadiusOptions {
  label?: string
}

export interface MapRadiusConfirmOptions {
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