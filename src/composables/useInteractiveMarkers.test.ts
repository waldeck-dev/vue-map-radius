import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useInteractiveMarkers } from './useInteractiveMarkers'
import type { MapContainerApi, InteractiveMarkerOptions, InteractiveMarkerCallbacks } from './useInteractiveMarkers'

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
    setCenter: vi.fn(),
    setRadius: vi.fn(),
    clamp: vi.fn(),
    emitState: vi.fn(),
  }
}

describe('useInteractiveMarkers', () => {
  it('returns handleBearing defaulting to 90', () => {
    const center = ref<[number, number] | null>(null)
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(null)
    const { handleBearing } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    expect(handleBearing.value).toBe(90)
  })

  it('renderCircle clears circle when no center', () => {
    const center = ref<[number, number] | null>(null)
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { renderCircle } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    renderCircle()
    expect(mapRef.value!.clearCircle).toHaveBeenCalledTimes(1)
  })

  it('renderCircle clears circle when radius <= 0', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(0)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { renderCircle } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    renderCircle()
    expect(mapRef.value!.clearCircle).toHaveBeenCalledTimes(1)
  })

  it('renderCircle calls updateCircle with coords when center + radius valid', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { renderCircle } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    renderCircle()
    expect(mapRef.value!.updateCircle).toHaveBeenCalledTimes(1)
    const coords = (mapRef.value!.updateCircle as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(coords).toHaveLength(65)
    expect(mapRef.value!.setVisibility).toHaveBeenCalledWith('radius')
  })

  it('updateInteractiveMarkers removes markers/line/tooltip when no center', () => {
    const center = ref<[number, number] | null>(null)
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateInteractiveMarkers } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    updateInteractiveMarkers()
    expect(mapRef.value!.removeCenterMarker).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.removeRadiusHandle).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.removeRadiusLine).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.hideRadiusTooltip).toHaveBeenCalledTimes(1)
  })

  it('updateInteractiveMarkers sets center marker when draggableCenter is true', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateInteractiveMarkers } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    updateInteractiveMarkers()
    expect(mapRef.value!.setCenterMarker).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.setCenterMarker).toHaveBeenCalledWith([0, 0], expect.objectContaining({ draggable: true }))
  })

  it('updateInteractiveMarkers sets radius handle and line when draggableRadius is true', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const { updateInteractiveMarkers } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    updateInteractiveMarkers()
    expect(mapRef.value!.setRadiusHandle).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.setRadiusLine).toHaveBeenCalledTimes(1)
    expect(mapRef.value!.setRadiusTooltip).toHaveBeenCalledTimes(1)
  })

  it('setCenterMarker receives onDragEnd callback that updates center and emits state', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateInteractiveMarkers } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, cb)
    updateInteractiveMarkers()
    const opts = (mapRef.value!.setCenterMarker as ReturnType<typeof vi.fn>).mock.calls[0][1]
    opts.onDragEnd([5, 10])
    expect(center.value).toEqual([5, 10])
    expect(cb.setCenter).toHaveBeenCalledWith([5, 10])
    expect(cb.emitState).toHaveBeenCalled()
  })

  it('setRadiusHandle receives onDragEnd callback that clamps radius and emits state', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { updateInteractiveMarkers } = useInteractiveMarkers(
      { ...defaultOpts, minRadius: 5, maxRadius: 100, radiusStep: 1 },
      center, radius, mapRef, cb,
    )
    updateInteractiveMarkers()
    const opts = (mapRef.value!.setRadiusHandle as ReturnType<typeof vi.fn>).mock.calls[0][1]
    opts.onDragEnd([0, 1])
    expect(cb.setRadius).toHaveBeenCalled()
    expect(cb.emitState).toHaveBeenCalled()
  })

  it('onRadiusBlur calls clamp and emitState', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(createMockMap())
    const cb = makeCallbacks()
    const { onRadiusBlur } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, cb)
    onRadiusBlur()
    expect(cb.clamp).toHaveBeenCalledTimes(1)
    expect(cb.emitState).toHaveBeenCalledTimes(1)
  })

  it('handles null mapRef gracefully (no errors)', () => {
    const center = ref<[number, number] | null>([0, 0])
    const radius = ref(10)
    const mapRef = ref<MapContainerApi | null>(null)
    const { renderCircle, updateInteractiveMarkers, onRadiusBlur } = useInteractiveMarkers(defaultOpts, center, radius, mapRef, makeCallbacks())
    expect(() => {
      renderCircle()
      updateInteractiveMarkers()
      onRadiusBlur()
    }).not.toThrow()
  })
})
