import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import type { MapRadiusPaintOptions } from '../../types'

export function useMapMarkers(map: Ref<maplibregl.Map | null>, paintOptions?: MapRadiusPaintOptions) {
  const centerMarkers = new Map<string, maplibregl.Marker>()
  const radiusHandles = new Map<string, maplibregl.Marker>()
  const radiusLineFeatures = new Map<string, GeoJSON.Feature>()
  let radiusTooltip: maplibregl.Marker | null = null
  let radiusTooltipEl: HTMLDivElement | null = null

  // --- Center marker ---

  function setCenterMarker(
    id: string,
    lngLat: [number, number],
    opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void },
  ) {
    if (!map.value) return
    const existing = centerMarkers.get(id)
    if (existing) {
      existing.setLngLat(lngLat)
      return
    }
    const el = document.createElement('div')
    el.className = 'vmr-center-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.background = paintOptions?.centerMarkerColor ?? '#3b82f6'
    el.style.border = '3px solid #fff'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
    el.style.cursor = 'grab'
    el.style.pointerEvents = 'auto'

    const draggable = opts?.draggable ?? true

    const marker = new maplibregl.Marker({ element: el, draggable })
      .setLngLat(lngLat)
      .addTo(map.value)
    centerMarkers.set(id, marker)

    const cb = opts?.onDragEnd
    if (draggable && cb) {
      marker.on('dragend', () => {
        const pos = marker.getLngLat()
        cb([pos.lng, pos.lat])
      })
    }

    const dragCb = opts?.onDrag
    if (draggable && dragCb) {
      marker.on('drag', () => {
        const pos = marker.getLngLat()
        dragCb([pos.lng, pos.lat])
      })
    }
  }

  function removeCenterMarker(id: string) {
    centerMarkers.get(id)?.remove()
    centerMarkers.delete(id)
  }

  // --- Radius handle ---

  function setRadiusHandle(
    id: string,
    lngLat: [number, number],
    opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void },
  ) {
    if (!map.value) return
    const existing = radiusHandles.get(id)
    if (existing) {
      existing.setLngLat(lngLat)
      return
    }
    const el = document.createElement('div')
    el.className = 'vmr-radius-handle'
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.border = '3px solid ' + (paintOptions?.radiusHandleColor ?? '#3b82f6')
    el.style.background = 'transparent'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
    el.style.cursor = 'ew-resize'
    el.style.pointerEvents = 'auto'
    el.style.transition = 'transform 0.1s'

    const draggable = opts?.draggable ?? true

    const marker = new maplibregl.Marker({ element: el, draggable })
      .setLngLat(lngLat)
      .addTo(map.value)
    radiusHandles.set(id, marker)

    const dragEndCb = opts?.onDragEnd
    if (draggable && dragEndCb) {
      marker.on('dragend', () => {
        const pos = marker.getLngLat()
        dragEndCb([pos.lng, pos.lat])
      })
    }

    const dragCb = opts?.onDrag
    if (draggable && dragCb) {
      marker.on('drag', () => {
        const pos = marker.getLngLat()
        dragCb([pos.lng, pos.lat])
      })
    }
  }

  function updateRadiusHandlePosition(id: string, lngLat: [number, number]) {
    radiusHandles.get(id)?.setLngLat(lngLat)
  }

  function removeRadiusHandle(id: string) {
    radiusHandles.get(id)?.remove()
    radiusHandles.delete(id)
  }

  // --- Radius line ---

  function syncRadiusLineSource() {
    const source = map.value?.getSource('vmr-radius-line-source') as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData({ type: 'FeatureCollection', features: [...radiusLineFeatures.values()] })
  }

  function setRadiusLine(id: string, from: [number, number], to: [number, number], color?: string) {
    radiusLineFeatures.set(id, {
      type: 'Feature',
      properties: { id, color },
      geometry: {
        type: 'LineString',
        coordinates: [from, to],
      },
    })
    syncRadiusLineSource()
  }

  function removeRadiusLine(id: string) {
    radiusLineFeatures.delete(id)
    syncRadiusLineSource()
  }

  // --- Radius tooltip ---
  // Stays a single global instance — only one handle can be dragged by one pointer at a time.

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
    el.style.color = paintOptions?.radiusTooltipColor ?? '#3b82f6'
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

  function setMarkersVisibility(visible: boolean) {
    for (const marker of centerMarkers.values()) {
      marker.getElement().style.display = visible ? '' : 'none'
    }
    for (const marker of radiusHandles.values()) {
      marker.getElement().style.display = visible ? '' : 'none'
    }
    if (radiusTooltip) {
      radiusTooltip.getElement().style.display = visible ? '' : 'none'
    }
  }

  function destroyMarkers() {
    for (const id of [...centerMarkers.keys()]) removeCenterMarker(id)
    for (const id of [...radiusHandles.keys()]) removeRadiusHandle(id)
    radiusLineFeatures.clear()
    syncRadiusLineSource()
    hideRadiusTooltip()
  }

  return {
    setCenterMarker,
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
  }
}
