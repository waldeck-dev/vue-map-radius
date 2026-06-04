import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGeocoding } from './useGeocoding'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const API_KEY = 'test-key-123'

describe('useGeocoding', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('constructs correct autocomplete URL for radius mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [], query: ['london'] })
    })
    const { search } = useGeocoding(API_KEY)
    await search('london', 'radius')
    const url = mockFetch.mock.calls[0][0]
    expect(url).toContain('api.maptiler.com/geocoding/london.json')
    expect(url).toContain('key=test-key-123')
    expect(url).toContain('autocomplete=true')
    expect(url).toContain('limit=5')
  })

  it('includes type filter for polygon mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [], query: ['france'] })
    })
    const { search } = useGeocoding(API_KEY)
    await search('france', 'polygon')
    const url = mockFetch.mock.calls[0][0]
    expect(decodeURIComponent(url)).toContain('types=country,region,subregion,county')
  })

  it('does not include type filter for radius mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [], query: ['paris'] })
    })
    const { search } = useGeocoding(API_KEY)
    await search('paris', 'radius')
    const url = mockFetch.mock.calls[0][0]
    expect(url).not.toContain('types=')
  })

  it('populates results on successful search', async () => {
    const mockResults = [
      {
        id: '1',
        place_name: 'London, UK',
        place_type: ['city'],
        center: [-0.12, 51.5],
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-0.12, 51.5] },
        relevance: 1,
        properties: {},
        text: 'London'
      }
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: mockResults, query: ['london'] })
    })
    const { search, results } = useGeocoding(API_KEY)
    await search('london', 'radius')
    expect(results.value.length).toBe(1)
    expect(results.value[0].placeName).toBe('London, UK')
  })

  it('sets error state on failed request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    })
    const { search, error } = useGeocoding(API_KEY)
    await search('unknown', 'radius')
    expect(error.value).toBeTruthy()
    if (error.value) {
      expect(error.value).toContain('Not Found')
    }
  })

  it('resets results when search is called with empty query', async () => {
    const { search, results } = useGeocoding(API_KEY)
    await search('', 'radius')
    expect(results.value).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches feature detail by ID', async () => {
    const mockFeature = {
      id: '123',
      place_name: 'France',
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: {},
      text: 'France'
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [mockFeature] })
    })
    const { fetchFeatureDetail } = useGeocoding(API_KEY)
    const result = await fetchFeatureDetail('123')
    expect(result).not.toBeNull()
    expect(result!.placeName).toBe('France')
    const url = mockFetch.mock.calls[0][0]
    expect(url).toContain('/geocoding/123.json')
  })

  it('sets loading state during search', async () => {
    let resolvePromise!: (value: unknown) => void
    const promise = new Promise(resolve => { resolvePromise = resolve })
    mockFetch.mockReturnValueOnce(promise)

    const { search, loading } = useGeocoding(API_KEY)
    const searchPromise = search('london', 'radius')
    expect(loading.value).toBe(true)
    resolvePromise({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [], query: ['london'] }) })
    await searchPromise
    expect(loading.value).toBe(false)
  })
})
