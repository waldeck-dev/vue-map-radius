import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSON } from 'geojson'

const CIRCLE_SOURCE = 'vmr-circle-source'
const CIRCLE_FILL_LAYER = 'vmr-circle-fill'
const CIRCLE_LINE_LAYER = 'vmr-circle-line'
const POLYGON_SOURCE = 'vmr-polygon-source'
const POLYGON_FILL_LAYER = 'vmr-polygon-fill'
const POLYGON_LINE_LAYER = 'vmr-polygon-line'

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
}

export function useMap(
  containerId: string,
  apiKey: string,
  center: [number, number],
  zoom: number,
): UseMapReturn {
  const map = ref<maplibregl.Map | null>(null) as Ref<maplibregl.Map | null>
  const mapReady = ref(false)

  function init() {
    if (map.value) return

    const instance = new maplibregl.Map({
      container: containerId,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      center,
      zoom,
    })

    instance.on('load', () => {
      instance.addSource(CIRCLE_SOURCE, { type: 'geojson', data: emptyFeature() })
      instance.addLayer({
        id: CIRCLE_FILL_LAYER,
        type: 'fill',
        source: CIRCLE_SOURCE,
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.2)',
        },
      })
      instance.addLayer({
        id: CIRCLE_LINE_LAYER,
        type: 'line',
        source: CIRCLE_SOURCE,
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      })

      instance.addSource(POLYGON_SOURCE, { type: 'geojson', data: emptyFeature() })
      instance.addLayer({
        id: POLYGON_FILL_LAYER,
        type: 'fill',
        source: POLYGON_SOURCE,
        paint: {
          'fill-color': 'rgba(34, 197, 94, 0.2)',
        },
      })
      instance.addLayer({
        id: POLYGON_LINE_LAYER,
        type: 'line',
        source: POLYGON_SOURCE,
        paint: {
          'line-color': '#22c55e',
          'line-width': 2,
        },
      })

      map.value = instance
      mapReady.value = true
    })
  }

  function updateCircle(coordinates: [number, number][]) {
    const source = map.value?.getSource(CIRCLE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    })
  }

  function updatePolygon(feature: GeoJSON.Feature) {
    const source = map.value?.getSource(POLYGON_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return

    source.setData(feature)
  }

  function setVisibility(mode: 'radius' | 'polygon') {
    if (!map.value) return

    const circleVisible = mode === 'radius'
    const polygonVisible = mode === 'polygon'

    setLayerVisibility(CIRCLE_FILL_LAYER, circleVisible)
    setLayerVisibility(CIRCLE_LINE_LAYER, circleVisible)
    setLayerVisibility(POLYGON_FILL_LAYER, polygonVisible)
    setLayerVisibility(POLYGON_LINE_LAYER, polygonVisible)
  }

  function setLayerVisibility(layerId: string, visible: boolean) {
    if (!map.value) return
    if (!map.value.getLayer(layerId)) return
    map.value.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }

  function fitBounds(bbox: [number, number, number, number], padding = 50) {
    map.value?.fitBounds(bbox, { padding })
  }

  function flyTo(c: [number, number], z?: number) {
    map.value?.flyTo({ center: c, zoom: z })
  }

  function clearCircle() {
    updateCircle([])
  }

  function clearPolygon() {
    const source = map.value?.getSource(POLYGON_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (source) {
      source.setData(emptyFeature())
    }
  }

  function destroy() {
    map.value?.remove()
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
  }
}

function emptyFeature(): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [],
    },
  }
}
