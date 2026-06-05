import { ref } from 'vue'
import type { GeocodingResult, MapTilerGeocodingResponse, MapTilerFeature } from '../types'

const BASE_URL = 'https://api.maptiler.com/geocoding'

const ADMIN_TYPES = 'country,region,subregion,county'

function mapFeature(f: MapTilerFeature): GeocodingResult {
  return {
    id: f.id,
    text: f.text,
    placeName: f.place_name,
    center: f.center,
    bbox: f.bbox,
    type: f.place_type?.[0] || f.type,
    geometry: f.geometry,
  }
}

export function useGeocoding(apiKey: string) {
  const results = ref<GeocodingResult[]>([])
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function search(query: string, mode: string) {
    if (!query.trim()) {
      results.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        key: apiKey,
        autocomplete: 'true',
        language: 'en',
        limit: '5',
      })

      if (mode === 'polygon') {
        params.set('types', ADMIN_TYPES)
      }

      const response = await fetch(`${BASE_URL}/${encodeURIComponent(query)}.json?${params}`)
      if (!response.ok) {
        throw new Error(response.statusText || 'Geocoding API error')
      }

      const data: MapTilerGeocodingResponse = await response.json()
      results.value = (data.features || []).map(mapFeature)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchFeatureDetail(id: string): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({ key: apiKey })
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}.json?${params}`)
    if (!response.ok) {
      throw new Error(`Geocoding detail API error: ${response.status}`)
    }

    const data: MapTilerGeocodingResponse = await response.json()
    const feature: MapTilerFeature | undefined = data.features?.[0]
    if (!feature) return null

    return mapFeature(feature)
  }

  return { search, results, error, loading, fetchFeatureDetail }
}
