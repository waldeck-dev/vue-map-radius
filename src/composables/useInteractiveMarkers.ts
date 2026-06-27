import { ref } from 'vue'
import type { Ref } from 'vue'
import type { GeoJSON } from 'geojson'
import { circleToPolygon, haversineDistance, destinationPoint } from '../utils/geo'

export interface InteractiveMarkerCallbacks {
  setCenter: (pos: [number, number]) => void
  setRadius: (val: number) => void
  clamp: () => void
  emitState: () => void
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
  updateCircle: (coords: [number, number][]) => void
  updatePolygon: (feature: GeoJSON.Feature) => void
  clearPolygon: () => void
  setVisibility: (mode: string) => void
  fitBounds: (bbox: [number, number, number, number]) => void
  flyTo: (center: [number, number], zoom?: number) => void
  setCenterMarker: (pos: [number, number], opts: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  removeCenterMarker: () => void
  setRadiusHandle: (pos: [number, number], opts: { draggable?: boolean; onDragEnd?: (pos: [number, number]) => void; onDrag?: (pos: [number, number]) => void }) => void
  updateRadiusHandlePosition: (pos: [number, number]) => void
  removeRadiusHandle: () => void
  setRadiusLine: (from: [number, number], to: [number, number]) => void
  removeRadiusLine: () => void
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
  centerPoint: Ref<[number, number] | null>,
  radiusKm: Ref<number>,
  mapRef: Ref<MapContainerApi | null>,
  callbacks: InteractiveMarkerCallbacks,
) {
  const handleBearing = ref<number>(90)
  let lastDragUpdate = 0

  function renderCircle() {
    if (!centerPoint.value || radiusKm.value <= 0) {
      mapRef.value?.clearCircle()
      return
    }
    const coords = circleToPolygon(centerPoint.value, radiusKm.value)
    mapRef.value?.updateCircle(coords)
    mapRef.value?.setVisibility('radius')
  }

  function updateInteractiveMarkers() {
    if (!centerPoint.value || radiusKm.value <= 0) {
      mapRef.value?.removeCenterMarker()
      mapRef.value?.removeRadiusHandle()
      mapRef.value?.removeRadiusLine()
      mapRef.value?.hideRadiusTooltip()
      return
    }
    const mc = mapRef.value
    if (!mc) return

    if (opts.draggableCenter) {
      mc.setCenterMarker(centerPoint.value, {
        draggable: true,
        onDragEnd: onCenterDragEnd,
        onDrag: onCenterDrag,
      })
    } else {
      mc.removeCenterMarker()
    }

    const handlePos = destinationPoint(centerPoint.value, radiusKm.value, handleBearing.value)

    if (opts.draggableRadius) {
      mc.setRadiusHandle(handlePos, {
        draggable: true,
        onDragEnd: onRadiusDragEnd,
        onDrag: onRadiusDrag,
      })
      mc.setRadiusLine(centerPoint.value, handlePos)
    } else {
      mc.removeRadiusHandle()
      mc.removeRadiusLine()
    }

    if (opts.showRadiusTooltip && opts.draggableRadius) {
      mc.setRadiusTooltip(roundToStep(radiusKm.value, opts.radiusStep) + ' km', handlePos)
    } else {
      mc.hideRadiusTooltip()
    }
  }

  function onCenterDragEnd(pos: [number, number]) {
    centerPoint.value = pos
    callbacks.setCenter(pos)
    renderCircle()
    updateInteractiveMarkers()
    callbacks.emitState()
  }

  function onCenterDrag(pos: [number, number]) {
    if (!centerPoint.value || radiusKm.value <= 0) return
    centerPoint.value = pos
    const now = Date.now()
    if (now - lastDragUpdate < 50) return
    lastDragUpdate = now
    const coords = circleToPolygon(pos, radiusKm.value)
    mapRef.value?.updateCircle(coords)
    const handlePos = destinationPoint(pos, radiusKm.value, handleBearing.value)
    mapRef.value?.updateRadiusHandlePosition(handlePos)
    mapRef.value?.setRadiusLine(pos, handlePos)
  }

  function onRadiusDragEnd(pos: [number, number]) {
    if (!centerPoint.value) return
    const [lng, lat] = centerPoint.value
    const [dlng, dlat] = [pos[0] - lng, pos[1] - lat]
    const bearing = (Math.atan2(dlng, dlat) * 180) / Math.PI
    handleBearing.value = (bearing + 360) % 360
    const dist = haversineDistance(centerPoint.value, pos)
    const clamped = Math.max(opts.minRadius, Math.min(opts.maxRadius, dist))
    callbacks.setRadius(roundToStep(clamped, opts.radiusStep))
    callbacks.emitState()
  }

  function onRadiusDrag(pos: [number, number]) {
    if (!centerPoint.value) return
    const dist = haversineDistance(centerPoint.value, pos)
    const clamped = Math.max(opts.minRadius, Math.min(opts.maxRadius, dist))
    const displayDist = roundToStep(clamped, opts.radiusStep)
    mapRef.value?.setRadiusTooltip(displayDist + ' km', pos)
    const now = Date.now()
    if (now - lastDragUpdate < 50) return
    lastDragUpdate = now
    const coords = circleToPolygon(centerPoint.value, clamped)
    mapRef.value?.updateCircle(coords)
    mapRef.value?.setRadiusLine(centerPoint.value, pos)
  }

  function onRadiusBlur() {
    callbacks.clamp()
    callbacks.setRadius(roundToStep(radiusKm.value, opts.radiusStep))
    callbacks.emitState()
  }

  return {
    handleBearing,
    renderCircle,
    updateInteractiveMarkers,
    onRadiusBlur,
  }
}
