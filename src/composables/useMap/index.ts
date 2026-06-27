import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapLayers, buildStyleUrl } from './layers'
import { useMapMarkers } from './markers'
import type { MapRadiusPaintOptions } from '../../types'

export { buildStyleUrl }

export interface UseMapReturn {
  map: Ref<maplibregl.Map | null>
  mapReady: Ref<boolean>
  init: () => void
  updateCircle: (coordinates: [number, number][]) => void
  updatePolygon: (feature: GeoJSON.Feature) => void
  setVisibility: (mode: 'radius' | 'polygon') => void
  fitBounds: (bbox: [number, number, number, number], padding?: number) => void
  flyTo: (c: [number, number], z?: number) => void
  clearCircle: () => void
  clearPolygon: () => void
  destroy: () => void

  setCenterMarker: (lngLat: [number, number], opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  updateCenterMarkerPosition: (lngLat: [number, number]) => void
  removeCenterMarker: () => void

  setRadiusHandle: (lngLat: [number, number], opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  updateRadiusHandlePosition: (lngLat: [number, number]) => void
  removeRadiusHandle: () => void

  setRadiusLine: (from: [number, number], to: [number, number]) => void
  removeRadiusLine: () => void

  setRadiusTooltip: (text: string, lngLat: [number, number]) => void
  hideRadiusTooltip: () => void
}

export function useMap(
  containerId: string,
  apiKey: string,
  center: [number, number],
  zoom: number,
  styleUrl?: string,
  paintOptions?: MapRadiusPaintOptions,
): UseMapReturn {
  const map = ref<maplibregl.Map | null>(null) as Ref<maplibregl.Map | null>

  const {
    mapReady,
    init,
    updateCircle,
    updatePolygon,
    setLayersVisibility,
    clearCircle,
    clearPolygon,
    fitBounds,
    flyTo,
    destroyMap,
  } = useMapLayers(map, containerId, apiKey, center, zoom, styleUrl, paintOptions)

  const {
    setCenterMarker,
    updateCenterMarkerPosition,
    removeCenterMarker,
    setRadiusHandle,
    updateRadiusHandlePosition,
    removeRadiusHandle,
    setRadiusLine,
    removeRadiusLine,
    setRadiusTooltip,
    hideRadiusTooltip,
    setMarkersVisibility,
    destroyMarkers,
  } = useMapMarkers(map, paintOptions)

  function setVisibility(mode: 'radius' | 'polygon') {
    setLayersVisibility(mode)
    setMarkersVisibility(mode === 'radius')
  }

  function destroy() {
    destroyMarkers()
    destroyMap()
    map.value = null
    mapReady.value = false
  }

  onUnmounted(destroy)

  return {
    map,
    mapReady,
    init,
    updateCircle,
    updatePolygon,
    setVisibility,
    fitBounds,
    flyTo,
    clearCircle,
    clearPolygon,
    destroy,
    setCenterMarker,
    updateCenterMarkerPosition,
    removeCenterMarker,
    setRadiusHandle,
    updateRadiusHandlePosition,
    removeRadiusHandle,
    setRadiusLine,
    removeRadiusLine,
    setRadiusTooltip,
    hideRadiusTooltip,
  }
}
