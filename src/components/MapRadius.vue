<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { Mode, GeocodingResult, MapRadiusState, MapRadiusZone, MapRadiusInteractiveOptions, MapRadiusSearchOptions, MapRadiusRadiusOptions, MapRadiusModeToggleOptions, MapRadiusMapOptions, MapRadiusGeoOptions, MapRadiusPaintOptions, MapRadiusZoneListOptions } from '../types'
import { useTranslation } from '../composables/useTranslation'
import { useGeocoding } from '../composables/useGeocoding'
import { useRadius } from '../composables/useRadius'
import { useGeoJSON } from '../composables/useGeoJSON'
import { circleToPolygon, toGeoJSON, circleBounds, getPolygonBounds, mergeToMultiPolygon } from '../utils/geo'
import { useInteractiveMarkers } from '../composables/useInteractiveMarkers'
import type { MapContainerApi } from '../composables/useInteractiveMarkers'
import SearchBar from './subcomponents/VMPSearchBar.vue'
import ModeToggle from './subcomponents/VMPModeToggle.vue'
import RadiusInput from './subcomponents/VMPRadiusInput.vue'
import ZoneList from './subcomponents/VMPZoneList.vue'
import MapContainer from './subcomponents/VMPMapContainer.vue'
import type { GeoJSON } from 'geojson'

const DEFAULT_ZONE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized
  const value = parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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
  zoneListOptions?: MapRadiusZoneListOptions
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
const zones = ref<MapRadiusZone[]>([])
const simplifyTolerance = computed(() => props.geoOptions?.simplifyTolerance ?? 0.025)
const zoneColors = computed(() => props.paintOptions?.zoneColors?.length ? props.paintOptions.zoneColors : DEFAULT_ZONE_COLORS)
function nextZoneColor(index: number): string {
  return zoneColors.value[index % zoneColors.value.length]
}
// Simplifying a country-sized polygon is the expensive part of adding a zone.
// Cache the result per raw geometry so unrelated zones aren't re-simplified
// every time the zones array changes (e.g. when another zone is added/removed).
const zoneGeometryCache = new WeakMap<GeoJSON.Geometry, { tolerance: number; geometry: GeoJSON.Geometry }>()
function getSimplifiedZoneGeometry(geometry: GeoJSON.Geometry, tolerance: number): GeoJSON.Geometry {
  const cached = zoneGeometryCache.get(geometry)
  if (cached && cached.tolerance === tolerance) return cached.geometry
  const simplified = trimPrecision(simplify(toGeoJSON(geometry), tolerance).geometry!)
  zoneGeometryCache.set(geometry, { tolerance, geometry: simplified })
  return simplified
}
const polygonFeature = computed<GeoJSON.Feature | null>(() =>
  mergeToMultiPolygon(zones.value.map((z) => getSimplifiedZoneGeometry(z.geometry, simplifyTolerance.value))),
)
function toOutputZone(zone: MapRadiusZone): MapRadiusZone {
  return {
    id: zone.id,
    name: zone.name,
    color: zone.color,
    geometry: getSimplifiedZoneGeometry(zone.geometry, simplifyTolerance.value),
  }
}
function zoneToFeature(zone: MapRadiusZone): GeoJSON.Feature {
  const color = zone.color ?? DEFAULT_ZONE_COLORS[0]
  return {
    type: 'Feature',
    properties: { id: zone.id, color, fillColor: hexToRgba(color, 0.3) },
    geometry: getSimplifiedZoneGeometry(zone.geometry, simplifyTolerance.value),
  }
}
const zoneFeatureCollection = computed<GeoJSON.FeatureCollection>(() => ({
  type: 'FeatureCollection',
  features: zones.value.map(zoneToFeature),
}))
const zonesName = computed<string | null>(() =>
  zones.value.length ? zones.value.map((z) => z.name).join(', ') : null,
)
const polygonName = ref<string | null>(null)

const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null)
const errorMsg = ref<string | null>(null)
const internalUpdating = ref(false)
const zoneLoading = ref(false)

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
const zoneRemoveLabel = computed(() => props.zoneListOptions?.removeLabel ?? t('zone.remove'))
const zoneLoadingLabel = computed(() => props.zoneListOptions?.loadingLabel ?? t('zone.loading'))

const visibleSearchResults = computed(() =>
  activeMode.value === 'polygon'
    ? searchResults.value.filter((r) => !zones.value.some((z) => z.id === r.id))
    : searchResults.value,
)

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
    zones.value = []
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
    zones.value = state.zones
      ? state.zones.map((z, i) => ({ ...z, color: z.color ?? nextZoneColor(i) }))
      : []
  }

  renderCurrentState()
  searchQuery.value = state.mode === 'radius' ? (state.name || '') : ''
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
      : activeMode.value === 'polygon'
        ? polygonFeature.value
        : null,
    name: activeMode.value === 'radius' ? polygonName.value : zonesName.value,
    zones: activeMode.value === 'polygon' ? zones.value.map(toOutputZone) : [],
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
    if (zones.value.some((z) => z.id === result.id)) {
      searchQuery.value = ''
      return
    }
    zoneLoading.value = true
    try {
      const feature = await fetchFeatureDetail(result.id)
      if (!feature || !feature.geometry) {
        mapContainerRef.value?.flyTo(result.center, 10)
        errorMsg.value = t('info.nonPolygon')
        return
      }
      if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
        centerPoint.value = feature.center
        mapContainerRef.value?.flyTo(feature.center, 10)
        errorMsg.value = t('info.nonPolygon')
        return
      }
      zones.value = [...zones.value, { id: result.id, name: feature.text, geometry: feature.geometry, color: nextZoneColor(zones.value.length) }]
      searchQuery.value = ''
      mapContainerRef.value?.updatePolygon(zoneFeatureCollection.value)
      mapContainerRef.value?.setVisibility('polygon')
      const bbox = getPolygonBounds(polygonFeature.value!) ?? (feature.bbox as [number, number, number, number] | undefined)
      if (bbox) {
        mapContainerRef.value?.fitBounds(bbox)
      }
      emitState()
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : t('error.network')
    } finally {
      zoneLoading.value = false
    }
  }
}

function removeZone(id: string) {
  zones.value = zones.value.filter((z) => z.id !== id)
  errorMsg.value = null
  if (zones.value.length === 0) {
    mapContainerRef.value?.clearPolygon()
  } else {
    mapContainerRef.value?.updatePolygon(zoneFeatureCollection.value)
    const bbox = getPolygonBounds(polygonFeature.value!)
    if (bbox) {
      mapContainerRef.value?.fitBounds(bbox)
    }
  }
  emitState()
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
    mapContainerRef.value?.updatePolygon(zoneFeatureCollection.value)
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
    zones.value = []
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
      :disabled="zoneLoading"
      :switch-mode="(m: Mode) => activeMode = m"
    >
      <ModeToggle
        :mode="activeMode"
        :radius-label="modeRadiusLabel"
        :polygon-label="modePolygonLabel"
        :disabled="zoneLoading"
        @update:mode="activeMode = $event"
      />
    </slot>
    <slot
      name="search-bar"
      :query="searchQuery"
      :placeholder="searchPlaceholder"
      :results="visibleSearchResults"
      :loading="searchLoading"
      :disabled="zoneLoading"
      :update-query="(val: string) => searchQuery = val"
      :on-select="onSelect"
    >
      <SearchBar
        :model-value="searchQuery"
        :placeholder="searchPlaceholder"
        :results="visibleSearchResults"
        :loading="searchLoading"
        :no-results-text="searchNoResultsText"
        :loading-text="searchLoadingText"
        :disabled="zoneLoading"
        @update:model-value="searchQuery = $event"
        @select="onSelect"
      />
    </slot>
    <div
      v-if="zoneLoading"
      class="vmr-zone-loading"
      role="status"
    >
      <span class="vmr-zone-spinner" />
      {{ zoneLoadingLabel }}
    </div>
    <slot
      v-if="activeMode === 'polygon' && zones.length > 0"
      name="zone-list"
      :zones="zones"
      :remove-zone="removeZone"
      :remove-label="zoneRemoveLabel"
      :disabled="zoneLoading"
    >
      <ZoneList
        :disabled="zoneLoading"
        :zones="zones"
        :remove-label="zoneRemoveLabel"
        @remove="removeZone"
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
.vmr-zone-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}
.vmr-zone-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--vmr-search-border, #d1d5db);
  border-top-color: var(--vmr-primary-color, #3b82f6);
  border-radius: 50%;
  animation: vmr-spin 0.6s linear infinite;
}
@keyframes vmr-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
