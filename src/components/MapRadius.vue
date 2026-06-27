<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { Mode, GeocodingResult, MapRadiusState, MapRadiusInteractiveOptions, MapRadiusSearchOptions, MapRadiusRadiusOptions, MapRadiusModeToggleOptions, MapRadiusMapOptions, MapRadiusGeoOptions, MapRadiusPaintOptions } from '../types'
import { useTranslation } from '../composables/useTranslation'
import { useGeocoding } from '../composables/useGeocoding'
import { useRadius } from '../composables/useRadius'
import { useGeoJSON } from '../composables/useGeoJSON'
import { circleToPolygon, toGeoJSON, circleBounds, getPolygonBounds } from '../utils/geo'
import { useInteractiveMarkers } from '../composables/useInteractiveMarkers'
import type { MapContainerApi } from '../composables/useInteractiveMarkers'
import SearchBar from './subcomponents/VMPSearchBar.vue'
import ModeToggle from './subcomponents/VMPModeToggle.vue'
import RadiusInput from './subcomponents/VMPRadiusInput.vue'
import MapContainer from './subcomponents/VMPMapContainer.vue'
import type { GeoJSON } from 'geojson'

const props = withDefaults(defineProps<{
  apiKey: string
  modelValue?: MapRadiusState
  center?: [number, number]
  zoom?: number
  minRadius?: number
  maxRadius?: number
  radiusStep?: number
  radiusPolygonPoints?: number
  mode?: Mode
  height?: string
  locale?: string
  translations?: Record<string, Record<string, string>>
  searchOptions?: MapRadiusSearchOptions
  radiusOptions?: MapRadiusRadiusOptions
  modeToggleOptions?: MapRadiusModeToggleOptions
  mapOptions?: MapRadiusMapOptions
  geoOptions?: MapRadiusGeoOptions
  paintOptions?: MapRadiusPaintOptions
  modes?: Mode[]
  interactiveOptions?: MapRadiusInteractiveOptions
}>(), {
  center: () => [0, 20] as [number, number],
  zoom: 2,
  minRadius: 0,
  maxRadius: Infinity,
  radiusStep: 1,
  radiusPolygonPoints: 16,
  modes: () => ['radius', 'polygon'] as Mode[],
  mode: 'radius' as Mode,
  height: '500px',
  locale: 'en',
  translations: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:modelValue', state: MapRadiusState): void
}>()

const { t } = useTranslation(props.locale, props.translations)
const { search: geocodeSearch, results: searchResults, loading: searchLoading, fetchFeatureDetail } = useGeocoding(props.apiKey, props.locale)
const { radiusKm, setRadius, clamp, validationMessage, setCenter } = useRadius(props.minRadius, props.maxRadius)
const { trimPrecision, simplify } = useGeoJSON(props.geoOptions)

const activeMode = ref<Mode>(props.mode)
const searchQuery = ref('')
const centerPoint = ref<[number, number] | null>(null)
const polygonFeature = ref<GeoJSON.Feature | null>(null)
const polygonName = ref<string | null>(null)

const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null)
const errorMsg = ref<string | null>(null)
const internalUpdating = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const draggableCenter = computed(() => props.interactiveOptions?.draggableCenter ?? true)
const draggableRadius = computed(() => props.interactiveOptions?.draggableRadius ?? true)
const showRadiusTooltip = computed(() => props.interactiveOptions?.showRadiusTooltip ?? true)

const searchPlaceholder = computed(() => props.searchOptions?.placeholder ?? t('search.placeholder'))
const searchNoResultsText = computed(() => props.searchOptions?.noResultsText ?? t('info.noResults'))
const searchLoadingText = computed(() => props.searchOptions?.loadingText ?? t('search.loading'))
const radiusLabel = computed(() => props.radiusOptions?.label ?? t('radius.label'))
const modeRadiusLabel = computed(() => props.modeToggleOptions?.radiusLabel ?? t('mode.radius'))
const modePolygonLabel = computed(() => props.modeToggleOptions?.polygonLabel ?? t('mode.polygon'))
const mapStyleUrl = computed(() => props.mapOptions?.style)
const showModeToggle = computed(() => props.modes.length > 1)

const {
  handleBearing,
  renderCircle,
  updateInteractiveMarkers,
  onRadiusBlur,
} = useInteractiveMarkers(
  {
    minRadius: props.minRadius,
    maxRadius: props.maxRadius,
    radiusStep: Math.max(1, props.radiusStep),
    draggableCenter: draggableCenter.value,
    draggableRadius: draggableRadius.value,
    showRadiusTooltip: showRadiusTooltip.value,
  },
  centerPoint,
  radiusKm,
  mapContainerRef as unknown as Ref<MapContainerApi | null>,
  {
    setCenter,
    setRadius,
    clamp,
    emitState,
    clearName,
  },
)

if (props.radiusStep < 0) {
  console.warn('[vue-map-radius] radiusStep must be >= 0, got ' + props.radiusStep)
}

if (!props.apiKey) {
  console.warn('[vue-map-radius] MapTiler API key is required')
  errorMsg.value = t('error.noApiKey')
}

watch(searchQuery, (val) => {
  if (internalUpdating.value) return
  if (searchTimeout) clearTimeout(searchTimeout)
  if (val.length < 2) {
    searchResults.value = []
    return
  }
  searchTimeout = setTimeout(() => {
    geocodeSearch(val, activeMode.value)
  }, 300)
})

function hydrate(state: MapRadiusState) {
  activeMode.value = state.mode
  errorMsg.value = null
  searchResults.value = []

  if (state.mode === 'radius') {
    polygonFeature.value = null
    polygonName.value = state.name || null
    if (state.center) {
      centerPoint.value = state.center
      setCenter(state.center)
    }
    setRadius(state.radiusKm)
    if (state.bearing != null) {
      handleBearing.value = state.bearing
    }
  } else {
    centerPoint.value = state.center || null
    polygonFeature.value = state.polygon || null
    polygonName.value = state.name || null
  }

  renderCurrentState()
  searchQuery.value = state.name || ''
}

function clearName() {
  polygonName.value = null
  searchQuery.value = ''
}

function emitState() {
  if (internalUpdating.value) return
  const state: MapRadiusState = {
    mode: activeMode.value,
    center: centerPoint.value,
    radiusKm: radiusKm.value,
    polygon: activeMode.value === 'radius' && centerPoint.value && radiusKm.value > 0
      ? trimPrecision(toGeoJSON([circleToPolygon(centerPoint.value, radiusKm.value, props.radiusPolygonPoints)]))
      : activeMode.value === 'polygon' && polygonFeature.value
        ? trimPrecision(simplify(polygonFeature.value, props.geoOptions?.simplifyTolerance ?? 0.01))
        : null,
    name: polygonName.value,
    bearing: handleBearing.value,
  }
  emit('update:modelValue', state)
}

watch(() => props.modelValue, (val) => {
  if (!val) return
  internalUpdating.value = true
  hydrate(val)
  nextTick(() => { internalUpdating.value = false })
}, { deep: true, immediate: true })

watch(() => mapContainerRef.value?.mapReady, (ready) => {
  if (ready && props.modelValue) {
    renderCurrentState()
  }
})

async function onSelect(result: GeocodingResult) {
  searchQuery.value = result.text
  searchResults.value = []
  errorMsg.value = null

  if (activeMode.value === 'radius') {
    polygonName.value = result.text
    centerPoint.value = result.center
    setCenter(result.center)
    mapContainerRef.value?.fitBounds(circleBounds(result.center, radiusKm.value))
    renderCircle()
    updateInteractiveMarkers()
    emitState()
  } else {
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
      polygonFeature.value = toGeoJSON(feature.geometry)
      polygonName.value = feature.text
      mapContainerRef.value?.updatePolygon(polygonFeature.value!)
      mapContainerRef.value?.setVisibility('polygon')
      if (feature.bbox) {
        mapContainerRef.value?.fitBounds(feature.bbox as [number, number, number, number])
      }
      emitState()
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : t('error.network')
    }
  }
}

function renderCurrentState() {
  if (!mapContainerRef.value?.mapReady) return
  if (activeMode.value === 'radius') {
    if (centerPoint.value && radiusKm.value > 0) {
      renderCircle()
      updateInteractiveMarkers()
      mapContainerRef.value?.fitBounds(circleBounds(centerPoint.value, radiusKm.value))
    }
  } else if (polygonFeature.value) {
    mapContainerRef.value?.updatePolygon(polygonFeature.value)
    mapContainerRef.value?.setVisibility('polygon')
    const bbox = getPolygonBounds(polygonFeature.value)
    if (bbox) {
      mapContainerRef.value?.fitBounds(bbox)
    } else if (centerPoint.value) {
      mapContainerRef.value?.flyTo(centerPoint.value)
    }
  }
}

watch(radiusKm, () => {
  if (internalUpdating.value) return
  renderCircle()
  if (centerPoint.value && radiusKm.value > 0) {
    mapContainerRef.value?.fitBounds(circleBounds(centerPoint.value, radiusKm.value))
  }
  if (draggableRadius.value) {
    nextTick(() => updateInteractiveMarkers())
  }
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
      updateInteractiveMarkers()
      mapContainerRef.value?.fitBounds(circleBounds(centerPoint.value, radiusKm.value))
    }
  } else {
    centerPoint.value = null
    mapContainerRef.value?.clearCircle()
    mapContainerRef.value?.removeCenterMarker()
    mapContainerRef.value?.removeRadiusHandle()
    mapContainerRef.value?.removeRadiusLine()
    mapContainerRef.value?.hideRadiusTooltip()
  }
  if (!internalUpdating.value) emitState()
})

const minMsg = computed(() => {
  const v = validationMessage.value
  if (v && v.key === 'radius.minMessage') return t(v.key, v.params)
  return undefined
})

const maxMsg = computed(() => {
  const v = validationMessage.value
  if (v && v.key === 'radius.maxMessage') return t(v.key, v.params)
  return undefined
})
</script>

<template>
  <div class="vmr-map-radius">
    <slot
      v-if="showModeToggle"
      name="mode-toggle"
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
    <div
      v-if="errorMsg"
      class="vmr-error-msg"
      role="alert"
    >
      {{ errorMsg }}
    </div>
    <MapContainer
      ref="mapContainerRef"
      :api-key="apiKey"
      :center="center"
      :zoom="zoom"
      :height="height"
      :map-style="mapStyleUrl"
      :paint-options="paintOptions"
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
