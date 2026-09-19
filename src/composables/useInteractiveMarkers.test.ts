import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useInteractiveMarkers } from './useInteractiveMarkers'
import type { MapContainerApi, InteractiveMarkerOptions, InteractiveMarkerCallbacks, RadiusCircleState } from './useInteractiveMarkers'

function createMockMap(): MapContainerApi {
  return {
    clearCircle: vi.fn(),
    updateCircle: vi.fn(),
    updatePolygon: vi.fn(),
    clearPolygon: vi.fn(),
    setVisibility: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    setCenterMarker: vi.fn(),
    removeCenterMarker: vi.fn(),
    setRadiusHandle: vi.fn(),
    updateRadiusHandlePosition: vi.fn(),
    removeRadiusHandle: vi.fn(),
    setRadiusLine: vi.fn(),
    removeRadiusLine: vi.fn(),
    setRadiusTooltip: vi.fn(),
    hideRadiusTooltip: vi.fn(),
  }
}

const defaultOpts: InteractiveMarkerOptions = {
  minRadius: 0,
  maxRadius: Infinity,
  radiusStep: 1,
  draggableCenter: true,
  draggableRadius: true,
  showRadiusTooltip: true,
}

function makeCallbacks(): InteractiveMarkerCallbacks {
  return {
    emitState: vi.fn(),
    clearName: vi.fn(),
  }
}

function makeCircle(overrides: Partial<RadiusCircleState> = {}): RadiusCircleState {
  return {
    id: 'a',
    name: 'Paris',
    center: [0, 0],
    radiusKm: 10,
    bearing: 90,
    color: '#3b82f6',
    ...overrides,
  }
}

describe('useInteractiveMarkers', () => {
  it('renderAllCircles clears the circle source when there are no circles', () => {
    const circles = ref<RadiusCircleState[]>([])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    renderAllCircles()
    expect(mapRef.value!.clearCircle).toHaveBeenCalledTimes(1)
  })

  it('renderAllCircles builds a FeatureCollection with one feature per circle', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' }), makeCircle({ id: 'b', center: [1, 1] })])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    renderAllCircles()
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(1)
    const data = (mapRef.value!.updateCircle as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(data.type).toBe('FeatureCollection')
    expect(data.features).toHaveLength(2)
    expect(mapRef.value!.setVisibility).toHaveBeenCalledWith('radius')
  })

  it('updateMarkersForCircle sets a center marker and radius handle for the given id', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    updateMarkersForCircle('a')
    expect(mapRef.value!.setCenterMarker).toHaveBeenCalledWith('a', [0, 0], expect.objectContaining({ draggable: true }))
    expect(mapRef.value!.setRadiusHandle).toHaveBeenCalledWith('a', expect.any(Array), expect.objectContaining({ draggable: true }))
    expect(mapRef.value!.setRadiusLine).toHaveBeenCalledWith('a', [0, 0], expect.any(Array), '#3b82f6')
  })

  it('updateMarkersForCircle removes markers when dragging is disabled', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(
      { ...defaultOpts, draggableCenter: false, draggableRadius: false },
      circles, ref(null), mapRef, makeCallbacks(),
    )
    updateMarkersForCircle('a')
    expect(mapRef.value!.removeCenterMarker).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusHandle).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusLine).toHaveBeenCalledWith('a')
  })

  it('updateMarkersForCircle does nothing for an unknown id', () => {
    const circles = ref<RadiusCircleState[]>([])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    expect(() => updateMarkersForCircle('missing')).not.toThrow()
    expect(mapRef.value!.setCenterMarker).not.toHaveBeenCalled()
  })

  it('center marker onDragEnd updates that circle, selects it, clears its name, and emits state', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' }), makeCircle({ id: 'b', center: [5, 5] })])
    const selectedCircleId = ref<string | null>('b')
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, selectedCircleId, mapRef, cb)
    updateMarkersForCircle('a')
    const dragOpts = (mapRef.value!.setCenterMarker as ReturnType<typeof vi.fn>).mock.calls[0][2]
    dragOpts.onDragEnd([7, 8])
    expect(circles.value.find((c) => c.id === 'a')!.center).toEqual([7, 8])
    expect(circles.value.find((c) => c.id === 'b')!.center).toEqual([5, 5])
    expect(selectedCircleId.value).toBe('a')
    expect(cb.clearName).toHaveBeenCalledWith('a')
    expect(cb.emitState).toHaveBeenCalled()
  })

  it('radius handle onDragEnd clamps the radius of that circle and hides the tooltip', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a', center: [0, 0] })])
    const selectedCircleId = ref<string | null>(null)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateMarkersForCircle } = useInteractiveMarkers(
      { ...defaultOpts, minRadius: 5, maxRadius: 100 },
      circles, selectedCircleId, mapRef, cb,
    )
    updateMarkersForCircle('a')
    const dragOpts = (mapRef.value!.setRadiusHandle as ReturnType<typeof vi.fn>).mock.calls[0][2]
    dragOpts.onDragEnd([0, 1]) // ~111km north of [0,0], within [5,100] so no clamping needed on the high end
    expect(circles.value.find((c) => c.id === 'a')!.radiusKm).toBeGreaterThan(5)
    expect(selectedCircleId.value).toBe('a')
    expect(mapRef.value!.hideRadiusTooltip).toHaveBeenCalled()
    expect(cb.emitState).toHaveBeenCalled()
  })

  it('onRadiusBlur clamps and rounds the given circle and emits state', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a', radiusKm: 500 })])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { onRadiusBlur } = useInteractiveMarkers({ ...defaultOpts, maxRadius: 100 }, circles, ref(null), mapRef, cb)
    onRadiusBlur('a')
    expect(circles.value.find((c) => c.id === 'a')!.radiusKm).toBe(100)
    expect(cb.emitState).toHaveBeenCalledTimes(1)
  })

  it('removeCircleMarkers removes the center marker, radius handle, and line for that id', () => {
    const circles = ref<RadiusCircleState[]>([])
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { removeCircleMarkers } = useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    removeCircleMarkers('a')
    expect(mapRef.value!.removeCenterMarker).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusHandle).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusLine).toHaveBeenCalledWith('a')
  })

  it('handles a null mapRef gracefully (no errors)', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapContainerApi | null>(null)
    const { renderAllCircles, updateMarkersForCircle, onRadiusBlur, removeCircleMarkers } =
      useInteractiveMarkers(defaultOpts, circles, ref(null), mapRef, makeCallbacks())
    expect(() => {
      renderAllCircles()
      updateMarkersForCircle('a')
      onRadiusBlur('a')
      removeCircleMarkers('a')
    }).not.toThrow()
  })
})
