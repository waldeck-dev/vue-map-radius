import { ref, onUnmounted } from 'vue'
import type { Ref, ShallowUnwrapRef } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMapLayers, buildStyleUrl } from './layers'
import { useMapMarkers } from './markers'
import type { MapRadiusPaintOptions } from '../../types'

export { buildStyleUrl }

/**
 * The map surface, derived from the two composables that implement it rather
 * than restated by hand. It used to be written out four times (this interface,
 * two destructures and a defineExpose list) plus a fifth, already-drifted copy
 * in useInteractiveMarkers, bridged by an `as unknown as` that turned off
 * checking on the only channel between the component and MapLibre.
 */
export type UseMapReturn =
  Omit<ReturnType<typeof useMapLayers>, 'setLayersVisibility' | 'destroyMap'>
  & Omit<ReturnType<typeof useMapMarkers>, 'setMarkersVisibility' | 'destroyMarkers'>
  & {
    map: Ref<maplibregl.Map | null>
    setVisibility: (mode: 'radius' | 'polygon') => void
    destroy: () => void
  }

/** What `defineExpose` of a UseMapReturn presents to a parent: refs unwrapped. */
export type MapContainerApi = ShallowUnwrapRef<UseMapReturn>

/** The drawing surface alone — no map instance, no lifecycle, no readiness. */
export type MapCommands = Omit<MapContainerApi, 'map' | 'init' | 'destroy' | 'mapReady'>

export function useMap(
  containerId: string,
  apiKey: string,
  center: [number, number],
  zoom: number,
  styleUrl?: string,
  paintOptions?: MapRadiusPaintOptions,
): UseMapReturn {
  const map = ref<maplibregl.Map | null>(null) as Ref<maplibregl.Map | null>

  const { setLayersVisibility, destroyMap, ...layers } = useMapLayers(map, containerId, apiKey, center, zoom, styleUrl, paintOptions)
  const { setMarkersVisibility, destroyMarkers, ...markers } = useMapMarkers(map, paintOptions)

  function setVisibility(mode: 'radius' | 'polygon') {
    setLayersVisibility(mode)
    setMarkersVisibility(mode === 'radius')
  }

  function destroy() {
    destroyMarkers()
    destroyMap()
    map.value = null
    layers.mapReady.value = false
  }

  onUnmounted(destroy)

  return { map, ...layers, ...markers, setVisibility, destroy }
}
