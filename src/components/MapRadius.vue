<script setup lang="ts">
import { ref, shallowRef, watch, computed, nextTick, toRaw } from 'vue'
import type { Ref } from 'vue'
import type { Mode, GeocodingResult, MapRadiusState, MapRadiusZone, MapRadiusInteractiveOptions, MapRadiusSearchOptions, MapRadiusRadiusOptions, MapRadiusModeToggleOptions, MapRadiusMapOptions, MapRadiusGeoOptions, MapRadiusPaintOptions, MapRadiusZoneListOptions } from '../types'
import { useTranslation } from '../composables/useTranslation'
import { useGeocoding } from '../composables/useGeocoding'
import { useGeoJSON } from '../composables/useGeoJSON'
import { circleToPolygon, toGeoJSON, hexToRgba, getPolygonBounds, mergeToMultiPolygon, splitOutlyingParts } from '../utils/geo'
import { getValidationMessage } from '../utils/radius'
import { useInteractiveMarkers } from '../composables/useInteractiveMarkers'
import type { MapContainerApi, RadiusCircleState } from '../composables/useInteractiveMarkers'
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
const { search: geocodeSearch, results: searchResults, loading: searchLoading, error: searchError, fetchFeatureDetail } = useGeocoding(props.apiKey, props.locale)
const { trimPrecision, simplify } = useGeoJSON(props.geoOptions)

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'circle-' + Math.random().toString(36).slice(2, 10)
}

const activeMode = ref<Mode>(props.mode)
const searchQuery = ref('')
const centerPoint = ref<[number, number] | null>(null)
// shallowRef, not ref: a country MultiPolygon holds 10^4-10^5 positions, and a
// deep ref would proxy every one of them — simplification then runs through a
// Proxy trap per coordinate. Every mutation below replaces the whole array, so
// identity-based invalidation is enough; do not mutate a zone in place.
const zones = shallowRef<MapRadiusZone[]>([])
const circles = ref<RadiusCircleState[]>([])
const selectedCircleId = ref<string | null>(null)
const selectedCircle = computed<RadiusCircleState | null>(() =>
  circles.value.find((c) => c.id === selectedCircleId.value) ?? null,
)
const simplifyTolerance = computed(() => props.geoOptions?.simplifyTolerance ?? 0.025)
const zoneColors = computed(() => props.paintOptions?.zoneColors?.length ? props.paintOptions.zoneColors : DEFAULT_ZONE_COLORS)
function nextZoneColor(index: number): string {
  return zoneColors.value[index % zoneColors.value.length]
}
/**
 * Picks the first palette colour nobody is using, so removing a zone and adding
 * another does not hand out a colour already on the map. Falls back to cycling
 * once every colour is taken.
 */
function unusedZoneColor(taken: (string | undefined)[]): string {
  const free = zoneColors.value.find((color) => !taken.includes(color))
  return free ?? nextZoneColor(taken.length)
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
const radiusPolygonFeature = computed<GeoJSON.Feature | null>(() =>
  mergeToMultiPolygon(circles.value.map((c) => toGeoJSON([circleToPolygon(c.center, c.radiusKm, props.radiusPolygonPoints)]).geometry!)),
)
function fitAllCirclesBounds() {
  if (!radiusPolygonFeature.value) return
  const bbox = getPolygonBounds(radiusPolygonFeature.value)
  if (bbox) mapContainerRef.value?.fitBounds(bbox)
}
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

const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null)
const errorMsg = ref<string | null>(null)
const internalUpdating = ref(false)
const zoneLoading = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null
/** Identity of the last state we emitted, used to ignore our own v-model echo. */
let lastEmitted: MapRadiusState | null = null

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

const displayZones = computed(() =>
  activeMode.value === 'polygon'
    ? zones.value
    : circles.value.map((c) => ({ id: c.id, name: c.name || `${c.radiusKm} km`, color: c.color })),
)
function removeDisplayZone(id: string) {
  if (activeMode.value === 'polygon') removeZone(id)
  else removeCircleZone(id)
}
function selectCircle(id: string) {
  if (selectedCircleId.value === id) return
  selectedCircleId.value = id
  const c = circles.value.find((circle) => circle.id === id)
  if (c) mapContainerRef.value?.flyTo(c.center)
  // The emitted center/radiusKm/name/bearing all describe the selected circle,
  // so selection has to emit or the parent keeps reporting the previous one.
  emitState()
}

const {
  renderCircle,
  renderAllCircles,
  updateMarkersForCircle,
  updateAllMarkers,
  removeCircleMarkers,
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
  circles,
  selectedCircleId,
  mapContainerRef as unknown as Ref<MapContainerApi | null>,
  {
    emitState,
    clearName,
    fitBounds: fitAllCirclesBounds,
  },
)

const selectedRadiusKm = computed<number>({
  get: () => selectedCircle.value?.radiusKm ?? 0,
  // Typing is provisional: redraw the ring so the field feels live, but leave
  // the camera and the markers alone until blur commits the value.
  set: (value) => {
    const c = selectedCircle.value
    if (!c) return
    c.radiusKm = value
    renderAllCircles()
  },
})

const radiusValidationMessage = computed(() => {
  const c = selectedCircle.value
  if (!c) return null
  return getValidationMessage(c.radiusKm, props.minRadius, props.maxRadius)
})

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

// A failed autocomplete used to surface as an empty dropdown: useGeocoding set
// its error ref and nobody read it, so a bad key or a rate limit was reported
// to the user as "no results found".
watch(searchError, (message) => {
  if (message) errorMsg.value = message
})

function hydrate(state: MapRadiusState) {
  errorMsg.value = null
  searchResults.value = []

  // Tear the other mode down here rather than from a watcher on activeMode: a
  // pre-flush watcher runs *after* this function's body and would undo the
  // assignments below (it used to null the centerPoint we are about to set).
  if (activeMode.value !== state.mode) {
    activeMode.value = state.mode
    teardownMode(state.mode)
  }

  if (state.mode === 'radius') {
    zones.value = []
    circles.value.forEach((c) => removeCircleMarkers(c.id))
    circles.value = (state.circles ?? []).map((c, i) => ({
      id: c.id,
      name: c.name,
      center: c.center,
      radiusKm: c.radiusKm,
      bearing: 90,
      color: c.color ?? nextZoneColor(i),
    }))
    selectedCircleId.value = circles.value[0]?.id ?? null
  } else {
    circles.value.forEach((c) => removeCircleMarkers(c.id))
    circles.value = []
    selectedCircleId.value = null
    centerPoint.value = state.center || null
    zones.value = state.zones
      ? state.zones.map((z, i) => ({ ...z, color: z.color ?? nextZoneColor(i) }))
      : []
  }

  renderCurrentState()
  searchQuery.value = ''
}

function clearName(id: string) {
  const c = circles.value.find((circle) => circle.id === id)
  if (c) c.name = null
}

function emitState() {
  if (internalUpdating.value) return
  const state: MapRadiusState = {
    mode: activeMode.value,
    center: activeMode.value === 'radius' ? (selectedCircle.value?.center ?? null) : centerPoint.value,
    radiusKm: activeMode.value === 'radius' ? (selectedCircle.value?.radiusKm ?? 0) : 0,
    polygon: activeMode.value === 'radius'
      ? (radiusPolygonFeature.value ? trimPrecision(radiusPolygonFeature.value) : null)
      : activeMode.value === 'polygon'
        ? polygonFeature.value
        : null,
    name: activeMode.value === 'radius' ? (selectedCircle.value?.name ?? null) : zonesName.value,
    zones: activeMode.value === 'polygon' ? zones.value.map(toOutputZone) : [],
    circles: activeMode.value === 'radius'
      ? circles.value.map((c) => ({ id: c.id, name: c.name, center: c.center, radiusKm: c.radiusKm, color: c.color }))
      : [],
    bearing: activeMode.value === 'radius' ? selectedCircle.value?.bearing : undefined,
  }
  lastEmitted = state
  emit('update:modelValue', state)
}

watch(() => props.modelValue, (val) => {
  if (!val) return
  // A v-model parent hands our own object straight back, usually wrapped in a
  // reactive proxy by its own ref. Re-hydrating from it would tear down and
  // rebuild every marker and refit the camera on every drag end, so compare the
  // raw object and only react to state we did not produce.
  if (toRaw(val) === lastEmitted) return
  internalUpdating.value = true
  hydrate(val)
  nextTick(() => { internalUpdating.value = false })
}, { immediate: true })

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
    const newCircle: RadiusCircleState = {
      id: generateId(),
      name: result.text,
      center: result.center,
      radiusKm: selectedCircle.value?.radiusKm ?? 10,
      bearing: 90,
      color: unusedZoneColor(circles.value.map((c) => c.color)),
    }
    circles.value = [...circles.value, newCircle]
    selectedCircleId.value = newCircle.id
    searchQuery.value = ''
    renderCircle(newCircle.id)
    mapContainerRef.value?.setVisibility('radius')
    updateMarkersForCircle(newCircle.id)
    fitAllCirclesBounds()
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
      const splitEnabled = props.geoOptions?.splitOutlyingTerritories ?? true
      const mainGeometry = splitEnabled
        ? splitOutlyingParts(feature.geometry, {
          distanceKm: props.geoOptions?.outlyingDistanceKm,
          sizeRatio: props.geoOptions?.outlyingSizeRatio,
        }).main
        : feature.geometry

      zones.value = [...zones.value, { id: result.id, name: feature.text, geometry: mainGeometry, color: unusedZoneColor(zones.value.map((z) => z.color)) }]
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

function removeCircleZone(id: string) {
  const removedIndex = circles.value.findIndex((c) => c.id === id)
  circles.value = circles.value.filter((c) => c.id !== id)
  removeCircleMarkers(id)
  errorMsg.value = null
  if (circles.value.length === 0) {
    selectedCircleId.value = null
    mapContainerRef.value?.clearCircle()
  } else {
    const nextIndex = Math.min(removedIndex, circles.value.length - 1)
    selectedCircleId.value = circles.value[nextIndex]?.id ?? null
    fitAllCirclesBounds()
  }
  emitState()
}

function renderCurrentState() {
  const map = mapContainerRef.value
  if (!map?.mapReady) return
  if (activeMode.value === 'radius') {
    map.setVisibility('radius')
    // Clears the source when there are no circles, so hydrating an empty
    // radius state no longer leaves the previous circles on the map.
    renderAllCircles()
    if (circles.value.length > 0) {
      updateAllMarkers()
      fitAllCirclesBounds()
    }
  } else {
    map.setVisibility('polygon')
    map.updatePolygon(zoneFeatureCollection.value)
    const bbox = polygonFeature.value ? getPolygonBounds(polygonFeature.value) : null
    if (bbox) {
      map.fitBounds(bbox)
    } else if (centerPoint.value) {
      map.flyTo(centerPoint.value)
    }
  }
}

/** Drops everything belonging to the mode we are leaving. */
function teardownMode(mode: Mode) {
  if (mode === 'radius') {
    zones.value = []
    mapContainerRef.value?.clearPolygon()
  } else {
    centerPoint.value = null
    circles.value.forEach((c) => removeCircleMarkers(c.id))
    circles.value = []
    selectedCircleId.value = null
    mapContainerRef.value?.clearCircle()
    mapContainerRef.value?.hideRadiusTooltip()
  }
}

function setMode(mode: Mode) {
  if (activeMode.value === mode) return
  activeMode.value = mode
  searchResults.value = []
  searchQuery.value = ''
  errorMsg.value = null
  teardownMode(mode)
  renderCurrentState()
  emitState()
}

const minMsg = computed(() => {
  const v = radiusValidationMessage.value
  if (v && v.key === 'radius.minMessage') return t(v.key, v.params)
  return undefined
})

const maxMsg = computed(() => {
  const v = radiusValidationMessage.value
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
      :switch-mode="setMode"
    >
      <ModeToggle
        :mode="activeMode"
        :radius-label="modeRadiusLabel"
        :polygon-label="modePolygonLabel"
        :disabled="zoneLoading"
        @update:mode="setMode"
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
      v-if="displayZones.length > 0"
      name="zone-list"
      :zones="displayZones"
      :remove-zone="removeDisplayZone"
      :remove-label="zoneRemoveLabel"
      :disabled="zoneLoading"
      :selected-id="activeMode === 'radius' ? selectedCircleId : undefined"
      :select-zone="activeMode === 'radius' ? selectCircle : undefined"
    >
      <ZoneList
        :disabled="zoneLoading"
        :zones="displayZones"
        :remove-label="zoneRemoveLabel"
        :selected-id="activeMode === 'radius' ? (selectedCircleId ?? undefined) : undefined"
        @remove="removeDisplayZone"
        @select="activeMode === 'radius' && selectCircle($event)"
      />
    </slot>
    <slot
      v-if="activeMode === 'radius' && selectedCircleId"
      name="radius-input"
      :radius="selectedRadiusKm"
      :set-radius="(v: number) => selectedRadiusKm = v"
      :label="radiusLabel"
      :step="props.radiusStep"
      :min-message="minMsg"
      :max-message="maxMsg"
      :on-blur="() => selectedCircleId && onRadiusBlur(selectedCircleId)"
    >
      <RadiusInput
        :model-value="selectedRadiusKm"
        :label="radiusLabel"
        :step="props.radiusStep"
        :min-message="minMsg"
        :max-message="maxMsg"
        @update:model-value="selectedRadiusKm = $event"
        @blur="selectedCircleId && onRadiusBlur(selectedCircleId)"
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
