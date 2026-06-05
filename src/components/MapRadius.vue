<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Mode, GeocodingResult, MapRadiusProps, MapRadiusSearchOptions, MapRadiusRadiusOptions, MapRadiusConfirmOptions, MapRadiusModeToggleOptions, MapRadiusMapOptions, MapRadiusGeoOptions } from '../types'
import { useTranslation } from '../composables/useTranslation'
import { useGeocoding } from '../composables/useGeocoding'
import { useRadius } from '../composables/useRadius'
import { useGeoJSON } from '../composables/useGeoJSON'
import { circleToPolygon, toGeoJSON } from '../utils/geo'
import SearchBar from './subcomponents/VMPSearchBar.vue'
import ModeToggle from './subcomponents/VMPModeToggle.vue'
import RadiusInput from './subcomponents/VMPRadiusInput.vue'
import ConfirmButton from './subcomponents/VMPConfirmButton.vue'
import MapContainer from './subcomponents/VMPMapContainer.vue'
import type { GeoJSON } from 'geojson'

const props = withDefaults(defineProps<{
  apiKey: string
  center?: [number, number]
  zoom?: number
  minRadius?: number
  maxRadius?: number
  radiusStep?: number
  mode?: Mode
  height?: string
  locale?: string
  translations?: Record<string, Record<string, string>>
  searchOptions?: MapRadiusSearchOptions
  radiusOptions?: MapRadiusRadiusOptions
  confirmOptions?: MapRadiusConfirmOptions
  modeToggleOptions?: MapRadiusModeToggleOptions
  mapOptions?: MapRadiusMapOptions
  geoOptions?: MapRadiusGeoOptions
  modes?: Mode[]
}>(), {
  center: () => [0, 20] as [number, number],
  zoom: 2,
  minRadius: 0,
  maxRadius: Infinity,
  radiusStep: 1,
  modes: () => ['radius', 'polygon'] as Mode[],
  mode: 'radius' as Mode,
  height: '500px',
  locale: 'en',
  translations: () => ({}),
})

const emit = defineEmits<{
  (e: 'confirm', feature: GeoJSON.Feature): void
}>()

const { t } = useTranslation(props.locale, props.translations)
const { search: geocodeSearch, results: searchResults, loading: searchLoading, error: searchError, fetchFeatureDetail } = useGeocoding(props.apiKey)
const { radiusKm, setRadius, clamp, validationMessage, center: radiusCenter, setCenter } = useRadius(props.minRadius, props.maxRadius)
const { trimPrecision, simplify } = useGeoJSON(props.geoOptions)

const activeMode = ref<Mode>(props.mode)
const searchQuery = ref('')
const centerPoint = ref<[number, number] | null>(null)
const polygonFeature = ref<GeoJSON.Feature | null>(null)
const polygonName = ref<string | null>(null)
const detailLoading = ref(false)

const mapContainerRef = ref<InstanceType<typeof MapContainer>>()
const errorMsg = ref<string | null>(null)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

// --- Merged display strings (grouped prop > translation > built-in) ---
const searchPlaceholder = computed(() => props.searchOptions?.placeholder ?? t('search.placeholder'))
const searchNoResultsText = computed(() => props.searchOptions?.noResultsText ?? t('info.noResults'))
const searchLoadingText = computed(() => props.searchOptions?.loadingText ?? t('search.loading'))
const radiusLabel = computed(() => props.radiusOptions?.label ?? t('radius.label'))
const confirmLabel = computed(() => props.confirmOptions?.label ?? t('confirm.button'))
const modeRadiusLabel = computed(() => props.modeToggleOptions?.radiusLabel ?? t('mode.radius'))
const modePolygonLabel = computed(() => props.modeToggleOptions?.polygonLabel ?? t('mode.polygon'))
const mapStyleUrl = computed(() => props.mapOptions?.style)
const showModeToggle = computed(() => props.modes.length > 1)

watch(() => props.modes, (modes) => {
  if (modes.length === 1 && !modes.includes(activeMode.value)) {
    activeMode.value = modes[0]
  }
}, { immediate: true })

watch(() => props.radiusStep, (val) => {
  if (val < 0) {
    console.warn('[vue-map-radius] radiusStep must be >= 0, got ' + val)
  }
}, { immediate: true })

if (!props.apiKey) {
  console.warn('[vue-map-radius] MapTiler API key is required')
  errorMsg.value = t('error.noApiKey')
}

watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (val.length < 2) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(() => {
    geocodeSearch(val, activeMode.value)
  }, 300)
})

async function onSelect(result: GeocodingResult) {
  searchQuery.value = result.text
  searchResults.value = []
  errorMsg.value = null

  if (activeMode.value === 'radius') {
    centerPoint.value = result.center
    setCenter(result.center)
    mapContainerRef.value?.flyTo(result.center, 10)
    renderCircle()
  } else {
    detailLoading.value = true
    try {
      const feature = await fetchFeatureDetail(result.id)
      if (!feature || !feature.geometry) {
        mapContainerRef.value?.flyTo(result.center, 10)
        errorMsg.value = t('info.nonPolygon')
        return
      }
      if (feature.geometry.type === 'Point') {
        centerPoint.value = feature.center
        mapContainerRef.value?.flyTo(feature.center, 10)
        errorMsg.value = t('info.nonPolygon')
        return
      }
      polygonFeature.value = simplify(toGeoJSON(feature.geometry))
      polygonName.value = feature.text
      mapContainerRef.value?.updatePolygon(polygonFeature.value!)
      mapContainerRef.value?.setVisibility('polygon')
      if (feature.bbox) {
        mapContainerRef.value?.fitBounds(feature.bbox)
      }
    } catch {
      errorMsg.value = t('error.network')
    } finally {
      detailLoading.value = false
    }
  }
}

function renderCircle() {
  if (!centerPoint.value || radiusKm.value <= 0) {
    mapContainerRef.value?.clearCircle()
    return
  }
  const coords = circleToPolygon(centerPoint.value, radiusKm.value)
  mapContainerRef.value?.updateCircle(coords)
  mapContainerRef.value?.setVisibility('radius')
}

watch(radiusKm, () => {
  renderCircle()
})

watch(activeMode, (mode) => {
  searchResults.value = []
  searchQuery.value = ''
  errorMsg.value = null
  if (mode === 'radius') {
    polygonFeature.value = null
    polygonName.value = null
    mapContainerRef.value?.clearPolygon()
    if (centerPoint.value && radiusKm.value > 0) {
      renderCircle()
    }
  } else {
    centerPoint.value = null
    mapContainerRef.value?.clearCircle()
  }
})

function onRadiusBlur() {
  clamp()
  renderCircle()
}

const canConfirm = computed(() => {
  if (activeMode.value === 'radius') {
    return centerPoint.value !== null && radiusKm.value > 0
  }
  return polygonFeature.value !== null
})

function onConfirm() {
  if (activeMode.value === 'radius' && centerPoint.value && radiusKm.value > 0) {
    const coords = circleToPolygon(centerPoint.value, radiusKm.value)
    emit('confirm', trimPrecision(toGeoJSON([coords])))
  } else if (activeMode.value === 'polygon' && polygonFeature.value) {
    emit('confirm', trimPrecision(polygonFeature.value))
  }
}

const minMsg = computed(() => {
  const v = validationMessage.value
  if (v && v.key === 'radius.minMessage') return t(v.key, v.params as unknown as Record<string, string | number>)
  return undefined
})

const maxMsg = computed(() => {
  const v = validationMessage.value
  if (v && v.key === 'radius.maxMessage') return t(v.key, v.params as unknown as Record<string, string | number>)
  return undefined
})
</script>

<template>
  <div class="vmr-map-radius">
    <slot v-if="showModeToggle" name="mode-toggle"
      :mode="activeMode"
      :radius-label="modeRadiusLabel"
      :polygon-label="modePolygonLabel"
      :switch-mode="(m: Mode) => activeMode = m"
    >
      <ModeToggle
        :mode="activeMode"
        :radius-label="modeRadiusLabel"
        :polygon-label="modePolygonLabel"
        @update:mode="activeMode = $event"
      />
    </slot>
    <slot
      name="search-bar"
      :query="searchQuery"
      :placeholder="searchPlaceholder"
      :results="searchResults"
      :loading="searchLoading"
      :update-query="(val: string) => searchQuery = val"
      :on-select="onSelect"
    >
      <SearchBar
        :model-value="searchQuery"
        :placeholder="searchPlaceholder"
        :results="searchResults"
        :loading="searchLoading"
        :no-results-text="searchNoResultsText"
        :loading-text="searchLoadingText"
        @update:model-value="searchQuery = $event"
        @select="onSelect"
      />
    </slot>
    <slot
      v-if="activeMode === 'radius'"
      name="radius-input"
      :radius="radiusKm"
      :set-radius="setRadius"
      :label="radiusLabel"
      :step="props.radiusStep"
      :min-message="minMsg"
      :max-message="maxMsg"
      :min-radius="minRadius"
      :max-radius="maxRadius"
      :on-blur="onRadiusBlur"
    >
      <RadiusInput
        :model-value="radiusKm"
        :label="radiusLabel"
        :step="props.radiusStep"
        :min-message="minMsg"
        :max-message="maxMsg"
        @update:model-value="setRadius($event)"
        @blur="onRadiusBlur"
      />
    </slot>
    <slot
      name="confirm-button"
      :label="confirmLabel"
      :on-confirm="onConfirm"
      :loading="detailLoading"
      :disabled="!canConfirm"
    >
      <ConfirmButton
        :label="confirmLabel"
        :loading="detailLoading"
        :disabled="!canConfirm"
        @confirm="onConfirm"
      />
    </slot>
    <div v-if="errorMsg" class="vmr-error-msg" role="alert">{{ errorMsg }}</div>
    <MapContainer
      ref="mapContainerRef"
      :api-key="apiKey"
      :center="center"
      :zoom="zoom"
      :height="height"
      :map-style="mapStyleUrl"
    />
  </div>
</template>

<style scoped>
.vmr-map-radius {
  display: flex;
  flex-direction: column;
}
.vmr-error-msg {
  font-size: 13px;
  color: #ef4444;
  text-align: center;
}
</style>