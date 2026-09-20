import type { Ref } from 'vue'
import type { GeoJSON } from 'geojson'
import type { MapContainerApi, MapCommands } from './useMap'
import { circleToPolygon, haversineDistance, destinationPoint, bearingTo, hexToRgba } from '../utils/geo'
import { clampRadius } from '../utils/radius'

/** Minimum delay between two reactive-state writes while a marker is dragged. */
const DRAG_THROTTLE_MS = 50

export interface RadiusCircleState {
  id: string
  name: string | null
  center: [number, number]
  radiusKm: number
  bearing: number
  color: string
}

interface DragHandlers {
  onDrag: (pos: [number, number]) => void
  onDragEnd: (pos: [number, number]) => void
}

export interface InteractiveMarkerCallbacks {
  emitState: () => void
  clearName?: (id: string) => void
  /** Called when a radius edit is committed (blur), not while typing or dragging. */
  fitBounds?: () => void
}

export interface InteractiveMarkerOptions {
  minRadius: number
  maxRadius: number
  radiusStep: number
  draggableCenter: boolean
  draggableRadius: boolean
  showRadiusTooltip: boolean
}

export type { MapContainerApi, MapCommands }

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
  /** Getter rather than a Ref, so a component's template ref needs no cast. */
  getMap: () => MapCommands | null | undefined,
  callbacks: InteractiveMarkerCallbacks,
) {
  const lastCenterDragUpdate = new Map<string, number>()
  const lastRadiusDragUpdate = new Map<string, number>()
  // Dragging one circle re-renders the whole collection, so keep the last built
  // feature per circle: only the circle actually being dragged gets rebuilt.
  const featureCache = new Map<string, { lng: number; lat: number; radiusKm: number; color: string; feature: GeoJSON.Feature }>()
  const handlerCache = new Map<string, { center: DragHandlers; radius: DragHandlers }>()

  function findCircle(id: string): RadiusCircleState | undefined {
    return circles.value.find((c) => c.id === id)
  }

  function toCircleFeature(c: RadiusCircleState): GeoJSON.Feature {
    const cached = featureCache.get(c.id)
    if (cached && cached.lng === c.center[0] && cached.lat === c.center[1] && cached.radiusKm === c.radiusKm && cached.color === c.color) {
      return cached.feature
    }
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: { id: c.id, color: c.color, fillColor: hexToRgba(c.color, 0.2) },
      geometry: { type: 'Polygon', coordinates: [circleToPolygon(c.center, c.radiusKm)] },
    }
    featureCache.set(c.id, { lng: c.center[0], lat: c.center[1], radiusKm: c.radiusKm, color: c.color, feature })
    return feature
  }

  function renderAllCircles() {
    if (circles.value.length === 0) {
      getMap()?.clearCircle()
      return
    }
    getMap()?.updateCircle({
      type: 'FeatureCollection',
      features: circles.value.map(toCircleFeature),
    })
  }

  function renderCircle(_id: string) {
    renderAllCircles()
  }

  function handlersFor(id: string) {
    let handlers = handlerCache.get(id)
    if (!handlers) {
      handlers = { center: makeCenterDragHandlers(id), radius: makeRadiusDragHandlers(id) }
      handlerCache.set(id, handlers)
    }
    return handlers
  }

  function updateMarkersForCircle(id: string) {
    const c = findCircle(id)
    const mc = getMap()
    if (!c || !mc) return

    const handlers = handlersFor(id)

    if (opts.draggableCenter) {
      mc.setCenterMarker(id, c.center, { draggable: true, onDragEnd: handlers.center.onDragEnd, onDrag: handlers.center.onDrag })
    } else {
      mc.removeCenterMarker(id)
    }

    const handlePos = destinationPoint(c.center, c.radiusKm, c.bearing)

    if (opts.draggableRadius) {
      mc.setRadiusHandle(id, handlePos, { draggable: true, onDragEnd: handlers.radius.onDragEnd, onDrag: handlers.radius.onDrag })
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
    getMap()?.removeCenterMarker(id)
    getMap()?.removeRadiusHandle(id)
    getMap()?.removeRadiusLine(id)
    lastCenterDragUpdate.delete(id)
    lastRadiusDragUpdate.delete(id)
    featureCache.delete(id)
    handlerCache.delete(id)
  }

  function makeCenterDragHandlers(id: string): DragHandlers {
    function onDrag(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      // Write to reactive state only on a throttled tick: the marker itself is
      // already following the pointer, and dragEnd commits the final position.
      const now = Date.now()
      if (now - (lastCenterDragUpdate.get(id) ?? 0) < DRAG_THROTTLE_MS) return
      lastCenterDragUpdate.set(id, now)
      c.center = pos
      selectedCircleId.value = id
      renderAllCircles()
      const handlePos = destinationPoint(pos, c.radiusKm, c.bearing)
      getMap()?.updateRadiusHandlePosition(id, handlePos)
      getMap()?.setRadiusLine(id, pos, handlePos, c.color)
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

  function makeRadiusDragHandlers(id: string): DragHandlers {
    function onDrag(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      const clamped = clampRadius(haversineDistance(c.center, pos), opts.minRadius, opts.maxRadius)
      // The tooltip tracks the pointer unthrottled; reactive state does not.
      if (opts.showRadiusTooltip) {
        getMap()?.setRadiusTooltip(roundToStep(clamped, opts.radiusStep) + ' km', pos)
      }
      const now = Date.now()
      if (now - (lastRadiusDragUpdate.get(id) ?? 0) < DRAG_THROTTLE_MS) return
      lastRadiusDragUpdate.set(id, now)
      // Writing the rounded value keeps the drawn circle in step with the
      // tooltip, and lets Vue skip the render entirely when it has not changed.
      c.radiusKm = roundToStep(clamped, opts.radiusStep)
      selectedCircleId.value = id
      renderAllCircles()
      getMap()?.setRadiusLine(id, c.center, pos, c.color)
    }

    function onDragEnd(pos: [number, number]) {
      const c = findCircle(id)
      if (!c) return
      c.bearing = bearingTo(c.center, pos)
      const clamped = clampRadius(haversineDistance(c.center, pos), opts.minRadius, opts.maxRadius)
      c.radiusKm = roundToStep(clamped, opts.radiusStep)
      selectedCircleId.value = id
      getMap()?.hideRadiusTooltip()
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
    callbacks.fitBounds?.()
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
