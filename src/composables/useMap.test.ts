import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'
import maplibregl from 'maplibre-gl'

const mockMap = vi.hoisted(() => ({
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  getSource: vi.fn(),
  getLayer: vi.fn(),
  setLayoutProperty: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  remove: vi.fn(),
}))

const mockMarkerInstances = vi.hoisted(() => [] as any[])

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(function () { return mockMap }),
    Marker: vi.fn(function () {
      const m = {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        on: vi.fn(),
        getLngLat: vi.fn(() => ({ lng: 0, lat: 0 })),
        remove: vi.fn(),
        getElement: vi.fn(() => document.createElement('div')),
        setOffset: vi.fn().mockReturnThis(),
      }
      mockMarkerInstances.push(m)
      return m
    }),
  }
}))

import { buildStyleUrl } from './useMap'
import { useMapMarkers } from './useMap/markers'
import { useMapLayers } from './useMap/layers'

describe('buildStyleUrl', () => {
  it('returns default URL when no styleUrl provided', () => {
    const result = buildStyleUrl(undefined, 'abc123')
    expect(result).toBe('https://api.maptiler.com/maps/streets-v2/style.json?key=abc123')
  })

  it('appends key when URL has no query params', () => {
    const result = buildStyleUrl('https://example.com/style.json', 'abc123')
    expect(result).toBe('https://example.com/style.json?key=abc123')
  })

  it('appends key when URL has existing query params', () => {
    const result = buildStyleUrl('https://example.com/style.json?version=2', 'abc123')
    expect(result).toBe('https://example.com/style.json?version=2&key=abc123')
  })

  it('returns URL as-is when key already present', () => {
    const url = 'https://example.com/style.json?key=existing'
    const result = buildStyleUrl(url, 'abc123')
    expect(result).toBe(url)
  })

  it('returns URL as-is when key is in fragment', () => {
    const url = 'https://example.com/style.json?foo=bar&key=xyz'
    const result = buildStyleUrl(url, 'abc123')
    expect(result).toBe(url)
  })
})

describe('useMapMarkers', () => {
  let mapRef: Ref<maplibregl.Map | null>

  beforeEach(() => {
    mockMarkerInstances.length = 0
    mapRef = ref(null)
  })

  it('returns all expected functions', () => {
    const m = useMapMarkers(mapRef)
    expect(m.setCenterMarker).toBeInstanceOf(Function)
    expect(m.updateCenterMarkerPosition).toBeInstanceOf(Function)
    expect(m.removeCenterMarker).toBeInstanceOf(Function)
    expect(m.setRadiusHandle).toBeInstanceOf(Function)
    expect(m.updateRadiusHandlePosition).toBeInstanceOf(Function)
    expect(m.removeRadiusHandle).toBeInstanceOf(Function)
    expect(m.setRadiusLine).toBeInstanceOf(Function)
    expect(m.removeRadiusLine).toBeInstanceOf(Function)
    expect(m.setRadiusTooltip).toBeInstanceOf(Function)
    expect(m.hideRadiusTooltip).toBeInstanceOf(Function)
    expect(m.setMarkersVisibility).toBeInstanceOf(Function)
    expect(m.destroyMarkers).toBeInstanceOf(Function)
  })

  it('does nothing when map is null', () => {
    const m = useMapMarkers(mapRef)
    expect(() => {
      m.setCenterMarker([0, 0])
      m.updateCenterMarkerPosition([1, 1])
      m.removeCenterMarker()
      m.setRadiusHandle([0, 0])
      m.updateRadiusHandlePosition([1, 1])
      m.removeRadiusHandle()
      m.setRadiusLine([0, 0], [1, 1])
      m.removeRadiusLine()
      m.setRadiusTooltip('text', [0, 0])
      m.hideRadiusTooltip()
      m.setMarkersVisibility(true)
      m.destroyMarkers()
    }).not.toThrow()
  })

  it('creates a center marker when map is available', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setCenterMarker([10, 20])

    expect(maplibregl.Marker).toHaveBeenCalled()
    const marker = mockMarkerInstances[0]
    expect(marker.setLngLat).toHaveBeenCalledWith([10, 20])
    expect(marker.addTo).toHaveBeenCalledWith(mockMap)
  })

  it('updates existing center marker position instead of creating new one', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setCenterMarker([10, 20])
    expect(mockMarkerInstances).toHaveLength(1)

    m.setCenterMarker([30, 40])
    expect(mockMarkerInstances).toHaveLength(1)
    expect(mockMarkerInstances[0].setLngLat).toHaveBeenLastCalledWith([30, 40])
  })

  it('attaches dragend handler when onDragEnd is provided', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)
    const onDragEnd = vi.fn()

    m.setCenterMarker([0, 0], { draggable: true, onDragEnd })

    const marker = mockMarkerInstances[0]
    expect(marker.on).toHaveBeenCalledWith('dragend', expect.any(Function))
  })

  it('creates a radius handle with correct position', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setRadiusHandle([5, 10])

    expect(maplibregl.Marker).toHaveBeenCalled()
    const marker = mockMarkerInstances[0]
    expect(marker.setLngLat).toHaveBeenCalledWith([5, 10])
    expect(marker.addTo).toHaveBeenCalledWith(mockMap)
  })

  it('creates a radius tooltip with correct text and position', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setRadiusTooltip('5 km', [2, 3])

    const marker = mockMarkerInstances[0]
    expect(marker.setLngLat).toHaveBeenCalledWith([2, 3])
    expect(marker.addTo).toHaveBeenCalledWith(mockMap)
  })

  it('updates existing tooltip position and text', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setRadiusTooltip('5 km', [2, 3])
    expect(mockMarkerInstances).toHaveLength(1)

    m.setRadiusTooltip('10 km', [4, 5])
    expect(mockMarkerInstances).toHaveLength(1)
    expect(mockMarkerInstances[0].setLngLat).toHaveBeenLastCalledWith([4, 5])
  })

  it('removes center marker and nulls the reference', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setCenterMarker([0, 0])
    const marker = mockMarkerInstances[0]

    m.removeCenterMarker()
    expect(marker.remove).toHaveBeenCalled()
  })

  it('setMarkersVisibility toggles center marker display style', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)
    m.setCenterMarker([0, 0])

    const marker = mockMarkerInstances[0]
    marker.getElement.mockReturnValue({ style: { display: '' } })

    m.setMarkersVisibility(false)
    expect(marker.getElement().style.display).toBe('none')

    m.setMarkersVisibility(true)
    expect(marker.getElement().style.display).toBe('')
  })

  it('destroyMarkers removes all markers', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const m = useMapMarkers(mapRef)

    m.setCenterMarker([0, 0])
    m.setRadiusHandle([1, 1])
    m.setRadiusTooltip('test', [2, 2])

    expect(mockMarkerInstances).toHaveLength(3)
    m.destroyMarkers()

    mockMarkerInstances.forEach(marker => {
      expect(marker.remove).toHaveBeenCalled()
    })
  })
})

describe('useMapLayers', () => {
  let mapRef: Ref<maplibregl.Map | null>

  beforeEach(() => {
    vi.clearAllMocks()
    mapRef = ref(null)
    mockMap.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'load') cb()
    })
  })

  it('returns all expected functions', () => {
    const l = useMapLayers(mapRef, 'container', 'key', [0, 0], 5)
    expect(l.mapReady).toBeDefined()
    expect(l.init).toBeInstanceOf(Function)
    expect(l.updateCircle).toBeInstanceOf(Function)
    expect(l.updatePolygon).toBeInstanceOf(Function)
    expect(l.setLayersVisibility).toBeInstanceOf(Function)
    expect(l.clearCircle).toBeInstanceOf(Function)
    expect(l.clearPolygon).toBeInstanceOf(Function)
    expect(l.fitBounds).toBeInstanceOf(Function)
    expect(l.flyTo).toBeInstanceOf(Function)
    expect(l.destroyMap).toBeInstanceOf(Function)
  })

  it('does nothing when init is called but map is already set', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const l = useMapLayers(mapRef, 'container', 'key', [0, 0], 5)

    l.init()

    expect(maplibregl.Map).not.toHaveBeenCalled()
  })

  it('creates a new map instance and sets up layers on load', () => {
    const l = useMapLayers(mapRef, 'test-container', 'test-key', [10, 20], 3)

    l.init()

    expect(maplibregl.Map).toHaveBeenCalledWith({
      container: 'test-container',
      style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=test-key',
      center: [10, 20],
      zoom: 3,
    })
    expect(mockMap.on).toHaveBeenCalledWith('load', expect.any(Function))
    expect(mockMap.addSource).toHaveBeenCalledTimes(3)
    expect(mockMap.addLayer).toHaveBeenCalledTimes(5)
    expect(mapRef.value).toStrictEqual(mockMap)
    expect(l.mapReady.value).toBe(true)
  })

  it('updateCircle calls setData on circle source', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const mockGeoSource = { setData: vi.fn() }
    mockMap.getSource.mockReturnValue(mockGeoSource)

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.updateCircle([[0, 0], [1, 1]])

    expect(mockMap.getSource).toHaveBeenCalledWith('vmr-circle-source')
    expect(mockGeoSource.setData).toHaveBeenCalledWith({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1]]],
      },
    })
  })

  it('updatePolygon calls setData on polygon source', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const mockGeoSource = { setData: vi.fn() }
    mockMap.getSource.mockReturnValue(mockGeoSource)

    const feature = { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [] } }
    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.updatePolygon(feature)

    expect(mockMap.getSource).toHaveBeenCalledWith('vmr-polygon-source')
    expect(mockGeoSource.setData).toHaveBeenCalledWith(feature)
  })

  it('setLayersVisibility toggles layer visibility', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    mockMap.getLayer.mockReturnValue(true)

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.setLayersVisibility('radius')

    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('vmr-circle-fill', 'visibility', 'visible')
    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('vmr-polygon-fill', 'visibility', 'none')
  })

  it('clearCircle delegates to updateCircle with empty array', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const mockGeoSource = { setData: vi.fn() }
    mockMap.getSource.mockReturnValue(mockGeoSource)

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.clearCircle()

    expect(mockMap.getSource).toHaveBeenCalledWith('vmr-circle-source')
    expect(mockGeoSource.setData).toHaveBeenCalled()
  })

  it('clearPolygon resets polygon source to empty feature', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map
    const mockGeoSource = { setData: vi.fn() }
    mockMap.getSource.mockReturnValue(mockGeoSource)

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.clearPolygon()

    expect(mockMap.getSource).toHaveBeenCalledWith('vmr-polygon-source')
    expect(mockGeoSource.setData).toHaveBeenCalled()
  })

  it('fitBounds delegates to map.fitBounds', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.fitBounds([-10, -10, 10, 10])

    expect(mockMap.fitBounds).toHaveBeenCalledWith([-10, -10, 10, 10], { padding: 50 })
  })

  it('fitBounds accepts custom padding', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.fitBounds([-10, -10, 10, 10], 100)

    expect(mockMap.fitBounds).toHaveBeenCalledWith([-10, -10, 10, 10], { padding: 100 })
  })

  it('flyTo delegates to map.flyTo', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.flyTo([1, 2])

    expect(mockMap.flyTo).toHaveBeenCalledWith({ center: [1, 2], zoom: undefined })
  })

  it('flyTo accepts zoom parameter', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.flyTo([1, 2], 10)

    expect(mockMap.flyTo).toHaveBeenCalledWith({ center: [1, 2], zoom: 10 })
  })

  it('destroyMap calls map.remove()', () => {
    mapRef.value = mockMap as unknown as maplibregl.Map

    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)
    l.destroyMap()

    expect(mockMap.remove).toHaveBeenCalled()
  })

  it('functions are safe to call when map is null', () => {
    const l = useMapLayers(mapRef, 'c', 'k', [0, 0], 5)

    expect(() => {
      l.updateCircle([])
      l.updatePolygon({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } })
      l.setLayersVisibility('radius')
      l.clearCircle()
      l.clearPolygon()
      l.fitBounds([0, 0, 1, 1])
      l.flyTo([0, 0])
      l.destroyMap()
    }).not.toThrow()
  })
})
