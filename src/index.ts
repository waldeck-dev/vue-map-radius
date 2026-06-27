/**
 * vue-map-radius — A Vue 3 component for radius and polygon visualization on MapTiler (MapLibre GL JS) maps.
 *
 * @packageDocumentation
 */

import MapRadius from './components/MapRadius.vue'
export default MapRadius

/** Drawing mode — radius circle or administrative polygon. */
export type {
  Mode,
  MapRadiusState,
  GeocodingResult,
  MapRadiusSearchOptions,
  MapRadiusRadiusOptions,
  MapRadiusModeToggleOptions,
  MapRadiusMapOptions,
  MapRadiusGeoOptions,
  MapRadiusPaintOptions,
  MapRadiusInteractiveOptions,
} from './types'

/** Convert a center point + radius into a polygon vertex array. */
export { circleToPolygon } from './utils/geo'
/** Wrap raw geometry coordinates into a GeoJSON Feature. */
export { toGeoJSON } from './utils/geo'
/** Truncate coordinate decimals in a GeoJSON object. */
export { trimCoordPrecision } from './utils/geo'
/** Simplify a polyline using the Ramer-Douglas-Peucker algorithm. */
export { ramerDouglasPeucker } from './utils/geo'
/** Apply RDP simplification to a Polygon/MultiPolygon Feature. */
export { simplifyPolygon } from './utils/geo'
/** Great-circle distance (km) between two coordinates. */
export { haversineDistance } from './utils/geo'
/** Destination coordinate given origin, distance (km), and bearing. */
export { destinationPoint } from './utils/geo'
/** Bounding box `[w, s, e, n]` of a circle given center and radius. */
export { circleBounds } from './utils/geo'
/** Bounding box `[w, s, e, n]` of a GeoJSON polygon feature. */
export { getPolygonBounds } from './utils/geo'

/** Coordinate precision trimming and polygon simplification. */
export { useGeoJSON } from './composables/useGeoJSON'
/** MapTiler Geocoding API wrapper for autocomplete search and detail lookup. */
export { useGeocoding } from './composables/useGeocoding'
/** Lightweight i18n with built-in en/fr locales and custom overrides. */
export { useTranslation } from './composables/useTranslation'
/** Radius state management with min/max clamping and validation. */
export { useRadius } from './composables/useRadius'
/** MapLibre GL map lifecycle — init, layers, markers, handles, tooltip. */
export { useMap, buildStyleUrl } from './composables/useMap'
