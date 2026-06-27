import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import type { MapRadiusPaintOptions } from '../../types'

export function useMapMarkers(map: Ref<maplibregl.Map | null>, paintOptions?: MapRadiusPaintOptions) {
  let centerMarker: maplibregl.Marker | null = null
  let radiusHandle: maplibregl.Marker | null = null
  let radiusTooltip: maplibregl.Marker | null = null
  let radiusTooltipEl: HTMLDivElement | null = null

  // --- Center marker ---

  function setCenterMarker(
    lngLat: [number, number],
    opts?: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void },
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
    el.style.background = paintOptions?.centerMarkerColor ?? '#3b82f6'
    el.style.border = '3px solid #fff'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
    el.style.cursor = 'grab'
    el.style.pointerEvents = 'auto'

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

    const dragCb = opts?.onDrag
    if (draggable && dragCb) {
      centerMarker.on('drag', () => {
        const pos = centerMarker!.getLngLat()
        dragCb([pos.lng, pos.lat])
      })
    }
  }

  function updateCenterMarkerPosition(lngLat: [number, number]) {
    centerMarker?.setLngLat(lngLat)
  }

  function removeCenterMarker() {
    centerMarker?.remove()
    centerMarker = null
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
    el.style.border = '3px solid ' + (paintOptions?.radiusHandleColor ?? '#3b82f6')
    el.style.background = 'transparent'
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
    el.style.cursor = 'ew-resize'
    el.style.pointerEvents = 'auto'
    el.style.transition = 'transform 0.1s'

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
  }

  // --- Radius line ---

  function setRadiusLine(from: [number, number], to: [number, number]) {
    const source = map.value?.getSource('vmr-radius-line-source') as maplibregl.GeoJSONSource | undefined
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
    const source = map.value?.getSource('vmr-radius-line-source') as maplibregl.GeoJSONSource | undefined
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
    if (centerMarker) {
      centerMarker.getElement().style.display = visible ? '' : 'none'
    }
    if (radiusHandle) {
      radiusHandle.getElement().style.display = visible ? '' : 'none'
    }
    if (radiusTooltip) {
      radiusTooltip.getElement().style.display = visible ? '' : 'none'
    }
  }

  function destroyMarkers() {
    removeCenterMarker()
    removeRadiusHandle()
    hideRadiusTooltip()
  }

  return {
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
