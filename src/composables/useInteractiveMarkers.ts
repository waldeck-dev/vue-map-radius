import type { Ref } from 'vue'
import type { GeoJSON } from 'geojson'
import { circleToPolygon, haversineDistance, destinationPoint, hexToRgba } from '../utils/geo'
import { clampRadius } from '../utils/radius'

export interface RadiusCircleState {
  id: string
  name: string | null
  center: [number, number]
  radiusKm: number
  bearing: number
  color: string
}

export interface InteractiveMarkerCallbacks {
  emitState: () => void
  clearName?: (id: string) => void
}

export interface InteractiveMarkerOptions {
  minRadius: number
  maxRadius: number
  radiusStep: number
  draggableCenter: boolean
  draggableRadius: boolean
  showRadiusTooltip: boolean
}

export interface MapContainerApi {
  mapReady?: boolean
  clearCircle: () => void
  updateCircle: (data: GeoJSON.Feature | GeoJSON.FeatureCollection) => void
  updatePolygon: (data: GeoJSON.Feature | GeoJSON.FeatureCollection) => void
  clearPolygon: () => void
  setVisibility: (mode: string) => void
  fitBounds: (bbox: [number, number, number, number]) => void
  flyTo: (center: [number, number], zoom?: number) => void
  setCenterMarker: (id: string, pos: [number, number], opts: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  removeCenterMarker: (id: string) => void
  setRadiusHandle: (id: string, pos: [number, number], opts: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  updateRadiusHandlePosition: (id: string, pos: [number, number]) => void
  removeRadiusHandle: (id: string) => void
  setRadiusLine: (id: string, from: [number, number], to: [number, number], color?: string) => void
  removeRadiusLine: (id: string) => void
  setRadiusTooltip: (text: string, pos: [number, number]) => void
  hideRadiusTooltip: () => void
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) return value
  const precision = Math.max(0, Math.ceil(-Math.log10(step)))
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

export function useInteractiveMarkers(
  opts: InteractiveMarkerOptions,
  circles: Ref<RadiusCircleState[]>,
  selectedCircleId: Ref<string | null>,
  mapRef: Ref<MapContainerApi | null>,
  callbacks: InteractiveMarkerCallbacks,
) {
  const lastCenterDragUpdate = new Map<string, number>()
  const lastRadiusDragUpdate = new Map<string, number>()

  function findCircle(id: string): RadiusCircleState | undefined {
    return circles.value.find((c) => c.id === id)
  }

  function toCircleFeature(c: RadiusCircleState): GeoJSON.Feature {
    return {
      type: 'Feature',
      properties: { id: c.id, color: c.color, fillColor: hexToRgba(c.color, 0.2) },
      geometry: { type: 'Polygon', coordinates: [circleToPolygon(c.center, c.radiusKm)] },
    }
  }

  function renderAllCircles() {
    if (circles.value.length === 0) {
      mapRef.value?.clearCircle()
      return
    }
    mapRef.value?.updateCircle({
      type: 'FeatureCollection',
      features: circles.value.map(toCircleFeature),
    })
    mapRef.value?.setVisibility('radius')
  }

  function renderCircle(_id: string) {
    renderAllCircles()
  }

  function updateMarkersForCircle(id: string) {
    const c = findCircle(id)
    const mc = mapRef.value
    if (!c || !mc) return

    if (opts.draggableCenter) {
      const { onDrag, onDragEnd } = makeCenterDragHandlers(id)
      mc.setCenterMarker(id, c.center, { draggable: true, onDragEnd, onDrag })
    } else {
      mc.removeCenterMarker(id)
    }

    const handlePos = destinationPoint(c.center, c.radiusKm, c.bearing)

    if (opts.draggableRadius) {
      const { onDrag, onDragEnd } = makeRadiusDragHandlers(id)
      mc.setRadiusHandle(id, handlePos, { draggable: true, onDragEnd, onDrag })
      mc.setRadiusLine(id, c.center, handlePos, c.color)
    } else {
      mc.removeRadiusHandle(id)
      mc.removeRadiusLine(id)
    }
  }

  function updateAllMarkers() {
    circles.value.forEach((c) => updateMarkersForCircle(c.id))
  }

  function removeCircleMarkers(id: string) {
    mapRef.value?.removeCenterMarker(id)
    mapRef.value?.removeRadiusHandle(id)
    mapRef.value?.removeRadiusLine(id)
    lastCenterDragUpdate.delete(id)
    lastRadiusDragUpdate.delete(id)
  }

  function makeCenterDragHandlers(id: string) {
    function onDrag(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      c.center = pos
      const now = Date.now()
      if (now - (lastCenterDragUpdate.get(id) ?? 0) < 50) return
      lastCenterDragUpdate.set(id, now)
      selectedCircleId.value = id
      renderAllCircles()
      const handlePos = destinationPoint(pos, c.radiusKm, c.bearing)
      mapRef.value?.updateRadiusHandlePosition(id, handlePos)
      mapRef.value?.setRadiusLine(id, pos, handlePos, c.color)
    }

    function onDragEnd(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      c.center = pos
      callbacks.clearName?.(id)
      selectedCircleId.value = id
      renderAllCircles()
      updateMarkersForCircle(id)
      callbacks.emitState()
    }

    return { onDrag, onDragEnd }
  }

  function makeRadiusDragHandlers(id: string) {
    function onDrag(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      const clamped = clampRadius(haversineDistance(c.center, pos), opts.minRadius, opts.maxRadius)
      c.radiusKm = clamped
      if (opts.showRadiusTooltip) {
        mapRef.value?.setRadiusTooltip(roundToStep(clamped, opts.radiusStep) + ' km', pos)
      }
      const now = Date.now()
      if (now - (lastRadiusDragUpdate.get(id) ?? 0) < 50) return
      lastRadiusDragUpdate.set(id, now)
      selectedCircleId.value = id
      renderAllCircles()
      mapRef.value?.setRadiusLine(id, c.center, pos, c.color)
    }

    function onDragEnd(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      const [lng, lat] = c.center
      const [dlng, dlat] = [pos[0] - lng, pos[1] - lat]
      const bearing = (Math.atan2(dlng, dlat) * 180) / Math.PI
      c.bearing = (bearing + 360) % 360
      const clamped = clampRadius(haversineDistance(c.center, pos), opts.minRadius, opts.maxRadius)
      c.radiusKm = roundToStep(clamped, opts.radiusStep)
      selectedCircleId.value = id
      mapRef.value?.hideRadiusTooltip()
      renderAllCircles()
      updateMarkersForCircle(id)
      callbacks.emitState()
    }

    return { onDrag, onDragEnd }
  }

  function onRadiusBlur(id: string) {
    const c = findCircle(id)
    if (!c) return
    c.radiusKm = roundToStep(clampRadius(c.radiusKm, opts.minRadius, opts.maxRadius), opts.radiusStep)
    renderAllCircles()
    updateMarkersForCircle(id)
    callbacks.emitState()
  }

  return {
    renderCircle,
    renderAllCircles,
    updateMarkersForCircle,
    updateAllMarkers,
    removeCircleMarkers,
    onRadiusBlur,
  }
}
