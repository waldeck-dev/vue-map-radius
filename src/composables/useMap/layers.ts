import { ref } from 'vue'
import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSON } from 'geojson'
import type { MapRadiusPaintOptions } from '../../types'

const CIRCLE_SOURCE = 'vmr-circle-source'
const CIRCLE_FILL_LAYER = 'vmr-circle-fill'
const CIRCLE_LINE_LAYER = 'vmr-circle-line'
const POLYGON_SOURCE = 'vmr-polygon-source'
const POLYGON_FILL_LAYER = 'vmr-polygon-fill'
const POLYGON_LINE_LAYER = 'vmr-polygon-line'
const RADIUS_LINE_SOURCE = 'vmr-radius-line-source'
const RADIUS_LINE_LAYER = 'vmr-radius-line-layer'

export function buildStyleUrl(url: string | undefined, key: string): string {
  if (!url) return 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + key
  if (/\bkey=/.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + 'key=' + key
}

export function useMapLayers(
  map: Ref<maplibregl.Map | null>,
  containerId: string,
  apiKey: string,
  center: [number, number],
  zoom: number,
  styleUrl?: string,
  paintOptions?: MapRadiusPaintOptions,
) {
  const mapReady = ref(false)

  function init() {
    if (map.value) return

    const instance = new maplibregl.Map({
      container: containerId,
      style: buildStyleUrl(styleUrl, apiKey),
      center,
      zoom,
    })

    const circleColor = paintOptions?.circleColor ?? 'rgba(59, 130, 246, 0.2)'
    const circleOutlineColor = paintOptions?.circleOutlineColor ?? '#3b82f6'
    const circleOutlineWidth = paintOptions?.circleOutlineWidth ?? 2
    const polygonColor = paintOptions?.polygonColor ?? 'rgba(34, 197, 94, 0.2)'
    const polygonOutlineColor = paintOptions?.polygonOutlineColor ?? '#22c55e'
    const polygonOutlineWidth = paintOptions?.polygonOutlineWidth ?? 2

    const circleFillPaint: Record<string, unknown> = { 'fill-color': circleColor }
    if (paintOptions?.circleOpacity != null) circleFillPaint['fill-opacity'] = paintOptions.circleOpacity

    const polygonFillPaint: Record<string, unknown> = { 'fill-color': polygonColor }
    if (paintOptions?.polygonOpacity != null) polygonFillPaint['fill-opacity'] = paintOptions.polygonOpacity

    instance.on('load', () => {
      instance.addSource(CIRCLE_SOURCE, { type: 'geojson', data: emptyFeature() })
      instance.addLayer({
        id: CIRCLE_FILL_LAYER,
        type: 'fill',
        source: CIRCLE_SOURCE,
        paint: circleFillPaint,
      })
      instance.addLayer({
        id: CIRCLE_LINE_LAYER,
        type: 'line',
        source: CIRCLE_SOURCE,
        paint: {
          'line-color': circleOutlineColor,
          'line-width': circleOutlineWidth,
        },
      })

      instance.addSource(POLYGON_SOURCE, { type: 'geojson', data: emptyFeature() })
      instance.addLayer({
        id: POLYGON_FILL_LAYER,
        type: 'fill',
        source: POLYGON_SOURCE,
        paint: polygonFillPaint,
      })
      instance.addLayer({
        id: POLYGON_LINE_LAYER,
        type: 'line',
        source: POLYGON_SOURCE,
        paint: {
          'line-color': polygonOutlineColor,
          'line-width': polygonOutlineWidth,
        },
      })

      instance.addSource(RADIUS_LINE_SOURCE, { type: 'geojson', data: emptyLineString() })
      instance.addLayer({
        id: RADIUS_LINE_LAYER,
        type: 'line',
        source: RADIUS_LINE_SOURCE,
        paint: {
          'line-color': circleOutlineColor,
          'line-width': 1.5,
          'line-dasharray': [3, 3],
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

  function setLayersVisibility(mode: 'radius' | 'polygon') {
    if (!map.value) return

    const circleVisible = mode === 'radius'
    const polygonVisible = mode === 'polygon'

    setLayerVisibility(CIRCLE_FILL_LAYER, circleVisible)
    setLayerVisibility(CIRCLE_LINE_LAYER, circleVisible)
    setLayerVisibility(RADIUS_LINE_LAYER, circleVisible)
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

  function destroyMap() {
    map.value?.remove()
  }

  return {
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

function emptyLineString(): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [],
    },
  }
}
