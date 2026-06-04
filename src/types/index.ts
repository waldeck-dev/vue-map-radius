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

export interface GeocodingResult {
  id: string
  text: string
  placeName: string
  center: [number, number]
  bbox?: [number, number, number, number]
  type: string
  geometry?: GeoJSON.Geometry
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
