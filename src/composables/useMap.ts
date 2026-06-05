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
const RADIUS_LINE_SOURCE = 'vmr-radius-line-source'
const RADIUS_LINE_LAYER = 'vmr-radius-line-layer'

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

  setCenterMarker: (lngLat: [number, number], opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void }) => void
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
): UseMapReturn {
  const map = ref<maplibregl.Map | null>(null) as Ref<maplibregl.Map | null>
  const mapReady = ref(false)

  let centerMarker: maplibregl.Marker | null = null
  let radiusHandle: maplibregl.Marker | null = null
  let radiusTooltip: maplibregl.Marker | null = null
  let centerMarkerEl: HTMLDivElement | null = null
  let radiusHandleEl: HTMLDivElement | null = null
  let radiusTooltipEl: HTMLDivElement | null = null

  function init() {
    if (map.value) return

    const instance = new maplibregl.Map({
      container: containerId,
      style: buildStyleUrl(styleUrl, apiKey),
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

      instance.addSource(RADIUS_LINE_SOURCE, { type: 'geojson', data: emptyLineString() })
      instance.addLayer({
        id: RADIUS_LINE_LAYER,
        type: 'line',
        source: RADIUS_LINE_SOURCE,
        paint: {
          'line-color': '#3b82f6',
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

  function setVisibility(mode: 'radius' | 'polygon') {
    if (!map.value) return

    const circleVisible = mode === 'radius'
    const polygonVisible = mode === 'polygon'

    setLayerVisibility(CIRCLE_FILL_LAYER, circleVisible)
    setLayerVisibility(CIRCLE_LINE_LAYER, circleVisible)
    setLayerVisibility(RADIUS_LINE_LAYER, circleVisible)
    setLayerVisibility(POLYGON_FILL_LAYER, polygonVisible)
    setLayerVisibility(POLYGON_LINE_LAYER, polygonVisible)

    const centerM = centerMarker
    const handleM = radiusHandle
    if (centerM) {
      centerM.getElement().style.display = circleVisible ? '' : 'none'
    }
    if (handleM) {
      handleM.getElement().style.display = circleVisible ? '' : 'none'
    }
    if (radiusTooltip) {
      radiusTooltip.getElement().style.display = circleVisible ? '' : 'none'
    }
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
    removeCenterMarker()
    removeRadiusHandle()
    hideRadiusTooltip()
    map.value?.remove()
    map.value = null
    mapReady.value = false
  }

  // --- Center marker ---

  function setCenterMarker(
    lngLat: [number, number],
    opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void },
  ) {
    if (!map.value) return
    if (centerMarker) {
      centerMarker.setLngLat(lngLat)
      return
    }
    const el = document.createElement('div')
    el.className = 'vmr-center-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.background = '#3b82f6'
    el.style.border = '3px solid #fff'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
    el.style.cursor = 'grab'
    el.style.pointerEvents = 'auto'

    centerMarkerEl = el
    const draggable = opts?.draggable ?? true

    centerMarker = new maplibregl.Marker({ element: el, draggable })
      .setLngLat(lngLat)
      .addTo(map.value)

    const cb = opts?.onDragEnd
    if (draggable && cb) {
      centerMarker.on('dragend', () => {
        const pos = centerMarker!.getLngLat()
        cb([pos.lng, pos.lat])
      })
    }
  }

  function updateCenterMarkerPosition(lngLat: [number, number]) {
    centerMarker?.setLngLat(lngLat)
  }

  function removeCenterMarker() {
    centerMarker?.remove()
    centerMarker = null
    centerMarkerEl = null
  }

  // --- Radius handle ---

  function setRadiusHandle(
    lngLat: [number, number],
    opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void },
  ) {
    if (!map.value) return
    if (radiusHandle) {
      radiusHandle.setLngLat(lngLat)
      return
    }
    const el = document.createElement('div')
    el.className = 'vmr-radius-handle'
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.border = '3px solid #3b82f6'
    el.style.background = 'transparent'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
    el.style.cursor = 'ew-resize'
    el.style.pointerEvents = 'auto'
    el.style.transition = 'transform 0.1s'

    radiusHandleEl = el
    const draggable = opts?.draggable ?? true

    radiusHandle = new maplibregl.Marker({ element: el, draggable })
      .setLngLat(lngLat)
      .addTo(map.value)

    const dragEndCb = opts?.onDragEnd
    if (draggable && dragEndCb) {
      radiusHandle.on('dragend', () => {
        const pos = radiusHandle!.getLngLat()
        dragEndCb([pos.lng, pos.lat])
      })
    }

    const dragCb = opts?.onDrag
    if (draggable && dragCb) {
      radiusHandle.on('drag', () => {
        const pos = radiusHandle!.getLngLat()
        dragCb([pos.lng, pos.lat])
      })
    }
  }

  function updateRadiusHandlePosition(lngLat: [number, number]) {
    radiusHandle?.setLngLat(lngLat)
  }

  function removeRadiusHandle() {
    radiusHandle?.remove()
    radiusHandle = null
    radiusHandleEl = null
  }

  // --- Radius line ---

  function setRadiusLine(from: [number, number], to: [number, number]) {
    const source = map.value?.getSource(RADIUS_LINE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [from, to],
      },
    })
  }

  function removeRadiusLine() {
    const source = map.value?.getSource(RADIUS_LINE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData(emptyLineString())
  }

  // --- Radius tooltip ---

  function setRadiusTooltip(text: string, lngLat: [number, number]) {
    if (!map.value) return
    if (radiusTooltip) {
      radiusTooltip.setLngLat(lngLat)
      if (radiusTooltipEl) {
        radiusTooltipEl.textContent = text
      }
      return
    }
    const el = document.createElement('div')
    el.className = 'vmr-radius-tooltip'
    el.textContent = text
    el.style.background = '#fff'
    el.style.color = '#3b82f6'
    el.style.fontSize = '11px'
    el.style.fontWeight = '600'
    el.style.padding = '2px 6px'
    el.style.borderRadius = '4px'
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'
    el.style.whiteSpace = 'nowrap'
    el.style.pointerEvents = 'none'

    radiusTooltipEl = el
    radiusTooltip = new maplibregl.Marker({ element: el })
      .setLngLat(lngLat)
      .setOffset([0, -20])
      .addTo(map.value)
  }

  function hideRadiusTooltip() {
    radiusTooltip?.remove()
    radiusTooltip = null
    radiusTooltipEl = null
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

function buildStyleUrl(url: string | undefined, key: string): string {
  if (!url) return "https://api.maptiler.com/maps/streets-v2/style.json?key=" + key
  if (/\bkey=/.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + 'key=' + key
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