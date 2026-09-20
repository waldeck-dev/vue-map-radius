import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useInteractiveMarkers } from './useInteractiveMarkers'
import type { MapCommands, InteractiveMarkerOptions, InteractiveMarkerCallbacks, RadiusCircleState } from './useInteractiveMarkers'

function createMockMap(): MapCommands {
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
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    renderAllCircles()
    expect(mapRef.value!.clearCircle).toHaveBeenCalledTimes(1)
  })

  it('renderAllCircles builds a FeatureCollection with one feature per circle', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' }), makeCircle({ id: 'b', center: [1, 1] })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    renderAllCircles()
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(1)
    const data = (mapRef.value!.updateCircle as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(data.type).toBe('FeatureCollection')
    expect(data.features).toHaveLength(2)
  })

  it('renderAllCircles does not touch layer visibility (a mode-transition concern)', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    renderAllCircles()
    expect(mapRef.value!.setVisibility).not.toHaveBeenCalled()
  })

  it('reuses the cached feature for circles that did not change', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' }), makeCircle({ id: 'b', center: [1, 1] })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { renderAllCircles } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    renderAllCircles()
    circles.value[1].radiusKm = 25
    renderAllCircles()
    const calls = (mapRef.value!.updateCircle as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[0][0].features[0]).toBe(calls[1][0].features[0])
    expect(calls[0][0].features[1]).not.toBe(calls[1][0].features[1])
  })

  it('updateMarkersForCircle sets a center marker and radius handle for the given id', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    updateMarkersForCircle('a')
    expect(mapRef.value!.setCenterMarker).toHaveBeenCalledWith('a', [0, 0], expect.objectContaining({ draggable: true }))
    expect(mapRef.value!.setRadiusHandle).toHaveBeenCalledWith('a', expect.any(Array), expect.objectContaining({ draggable: true }))
    expect(mapRef.value!.setRadiusLine).toHaveBeenCalledWith('a', [0, 0], expect.any(Array), '#3b82f6')
  })

  it('updateMarkersForCircle removes markers when dragging is disabled', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(
      { ...defaultOpts, draggableCenter: false, draggableRadius: false },
      circles, ref(null), () => mapRef.value, makeCallbacks(),
    )
    updateMarkersForCircle('a')
    expect(mapRef.value!.removeCenterMarker).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusHandle).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusLine).toHaveBeenCalledWith('a')
  })

  it('updateMarkersForCircle does nothing for an unknown id', () => {
    const circles = ref<RadiusCircleState[]>([])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    expect(() => updateMarkersForCircle('missing')).not.toThrow()
    expect(mapRef.value!.setCenterMarker).not.toHaveBeenCalled()
  })

  it('center marker onDragEnd updates that circle, selects it, clears its name, and emits state', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' }), makeCircle({ id: 'b', center: [5, 5] })])
    const selectedCircleId = ref<string | null>('b')
    const mapRef = ref<MapCommands | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateMarkersForCircle } = useInteractiveMarkers(defaultOpts, circles, selectedCircleId, () => mapRef.value, cb)
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
    const mapRef = ref<MapCommands | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateMarkersForCircle } = useInteractiveMarkers(
      { ...defaultOpts, minRadius: 5, maxRadius: 100 },
      circles, selectedCircleId, () => mapRef.value, cb,
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
    const mapRef = ref<MapCommands | null>(createMockMap())
    const cb = makeCallbacks()
    const { onRadiusBlur } = useInteractiveMarkers({ ...defaultOpts, maxRadius: 100 }, circles, ref(null), () => mapRef.value, cb)
    onRadiusBlur('a')
    expect(circles.value.find((c) => c.id === 'a')!.radiusKm).toBe(100)
    expect(cb.emitState).toHaveBeenCalledTimes(1)
  })

  it('removeCircleMarkers removes the center marker, radius handle, and line for that id', () => {
    const circles = ref<RadiusCircleState[]>([])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { removeCircleMarkers } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    removeCircleMarkers('a')
    expect(mapRef.value!.removeCenterMarker).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusHandle).toHaveBeenCalledWith('a')
    expect(mapRef.value!.removeRadiusLine).toHaveBeenCalledWith('a')
  })

  it('handles a null mapRef gracefully (no errors)', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a' })])
    const mapRef = ref<MapCommands | null>(null)
    const { renderAllCircles, updateMarkersForCircle, onRadiusBlur, removeCircleMarkers } =
      useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, makeCallbacks())
    expect(() => {
      renderAllCircles()
      updateMarkersForCircle('a')
      onRadiusBlur('a')
      removeCircleMarkers('a')
    }).not.toThrow()
  })

  it('onRadiusBlur clamps, rounds, and fits the camera once', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a', radiusKm: 12.7 })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const cb = makeCallbacks()
    cb.fitBounds = vi.fn()
    const { onRadiusBlur } = useInteractiveMarkers(defaultOpts, circles, ref(null), () => mapRef.value, cb)
    onRadiusBlur('a')
    expect(circles.value[0].radiusKm).toBe(13)
    expect(cb.fitBounds).toHaveBeenCalledTimes(1)
    expect(cb.emitState).toHaveBeenCalledTimes(1)
  })
})

describe('useInteractiveMarkers drag throttling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function startDrag(circles: ReturnType<typeof ref<RadiusCircleState[]>>, mapRef: ReturnType<typeof ref<MapCommands | null>>) {
    const api = useInteractiveMarkers(defaultOpts, circles as never, ref(null), () => mapRef.value, makeCallbacks())
    api.updateMarkersForCircle('a')
    const centerOpts = (mapRef.value!.setCenterMarker as ReturnType<typeof vi.fn>).mock.calls[0][2]
    const radiusOpts = (mapRef.value!.setRadiusHandle as ReturnType<typeof vi.fn>).mock.calls[0][2]
    return { api, centerOpts, radiusOpts }
  }

  it('radius drag writes reactive state at most once per window, rounded, while the tooltip tracks every tick', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a', center: [0, 0], radiusKm: 10 })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { radiusOpts } = startDrag(circles, mapRef)

    for (let i = 0; i < 5; i++) {
      radiusOpts.onDrag([0, 0.5])
      vi.advanceTimersByTime(10)
    }

    // 0.5 degrees north of the equator is ~55.66 km: state holds the rounded value
    expect(circles.value[0].radiusKm).toBe(56)
    expect(mapRef.value!.setRadiusTooltip).toHaveBeenCalledTimes(5)
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60)
    radiusOpts.onDrag([0, 0.5])
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(2)
  })

  it('center drag only commits a position on a throttled tick', () => {
    const circles = ref<RadiusCircleState[]>([makeCircle({ id: 'a', center: [0, 0] })])
    const mapRef = ref<MapCommands | null>(createMockMap())
    const { centerOpts } = startDrag(circles, mapRef)

    centerOpts.onDrag([1, 1])
    centerOpts.onDrag([2, 2])
    centerOpts.onDrag([3, 3])

    expect(circles.value[0].center).toEqual([1, 1])
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(1)

    centerOpts.onDragEnd([4, 4])
    expect(circles.value[0].center).toEqual([4, 4])
  })
})
