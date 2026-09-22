# vue-map-radius

[![npm version](https://img.shields.io/npm/v/vue-map-radius)](https://www.npmjs.com/package/vue-map-radius)

A Vue 3 component for drawing radius circles and administrative polygons on [MapTiler](https://www.maptiler.com/) (MapLibre GL JS) maps.

## Motivations

I built this over a weekend because my team needed a map radius/polygon picker — a low-priority feature that kept getting deprioritised. It was also a chance to try out **vibe coding**: letting an AI assistant drive most of the implementation. v1 was written with [**OpenCode**](https://opencode.ai/docs/en/) running the **Big Pickle** model; v2 — the multi-circle rewrite — with [**Claude Code**](https://claude.com/claude-code) on **Opus**. The result is a real, shippable component that solved the original need and doubled as a fun experiment in AI-assisted development.

## Features

- **Radius mode** — add any number of circles by search, each one independently draggable by its centre or its radius handle
- **Polygon mode** — search and merge administrative boundaries (country, region, subregion, county) into one shape
- **One combined output** — every circle or zone merges into a single `MultiPolygon`, emitted separately from the model
- **Round-trippable `v-model`** — what comes out goes back in: store it, reload, and the map rebuilds itself
- **Accessible** — combobox search, radiogroup mode toggle and selectable chips, all keyboard- and screen-reader-operable
- **TypeScript** — typed props, emits, slots and exposed methods
- **Lightweight** — 13.4 kB (JS) + 1.3 kB (CSS) gzipped, on top of MapLibre itself (`npm run size`)

## Installation

```bash
npm install vue-map-radius
```

You also need **vue** (3.5+) and **maplibre-gl** (6+) as peer dependencies:

```bash
npm install vue maplibre-gl
```

MapLibre ships its own stylesheet, and this package does **not** inline it —
import it once in your app, alongside this package's:

```ts
import "maplibre-gl/dist/maplibre-gl.css"
import "vue-map-radius/style.css"
```

### Point MapLibre at its worker

MapLibre 6 locates its web worker through its own `import.meta.url`, which no
bundler resolves to the real file, so **every app calls `setWorkerUrl()` once**
at startup — without it the map paints its background colour and no tile ever
appears. This is MapLibre's requirement, not this package's; see its
[installation guide](https://maplibre.org/maplibre-gl-js/docs/) for the other
bundlers. With Vite:

```ts
// main.ts
import { setWorkerUrl } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

setWorkerUrl(workerUrl)
```

`?worker&url`, not a bare `?url`: the worker imports a sibling
`maplibre-gl-shared.mjs` that `?url` does not emit, and tiles then fail to parse
in production only. Vite's dev server also needs MapLibre kept out of its
dependency pre-bundler, which moves that `import.meta.url` somewhere the worker
is not:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ["maplibre-gl"] },
})
```

`docs/main.ts` and `vite.config.ts` in this repo do exactly this, if you want a
working reference.

## Quick start

```vue
<script setup lang="ts">
import { ref } from "vue"
import MapRadius from "vue-map-radius"
import type { MapRadiusState, MapRadiusGeometry } from "vue-map-radius"
import "maplibre-gl/dist/maplibre-gl.css"
import "vue-map-radius/style.css"

// Restore this from your backend and the map rebuilds itself.
const state = ref<MapRadiusState>({ mode: "radius", circles: [] })

// Derived output: the merged shape of everything drawn. Never fed back in.
const geometry = ref<MapRadiusGeometry | null>(null)
</script>

<template>
  <MapRadius
    v-model="state"
    api-key="YOUR_MAPTILER_API_KEY"
    :center="[2.3522, 48.8566]"
    :zoom="10"
    height="500px"
    @geometry="geometry = $event"
  />
</template>
```

## State vs. geometry

The model holds **what the user chose**; the geometry is **what that draws**. Keeping them apart is what makes the model small enough to store and safe to hand back:

```ts
type MapRadiusState = MapRadiusRadiusState | MapRadiusPolygonState

interface MapRadiusRadiusState {
  mode: "radius"
  circles: MapRadiusCircleZone[]      // { id, name, center, radiusKm, color?, bearing? }
  selectedCircleId?: string | null    // which circle the radius field edits
}

interface MapRadiusPolygonState {
  mode: "polygon"
  zones: MapRadiusZone[]              // { id, name, geometry, color? }
  center?: [number, number] | null    // fallback centre when a result had no polygon
}
```

`mode` discriminates the union, so `state.circles` and `state.zones` narrow correctly:

```ts
if (state.mode === "radius") state.circles.forEach(/* … */)
```

The merged shape arrives through the `geometry` event (or `getGeometry()` on the instance), never inside the model:

```ts
interface MapRadiusGeometry {
  feature: GeoJSON.Feature<GeoJSON.MultiPolygon> | null
  name: string | null
}
```

Circle geometry is generated from `center` + `radiusKm`, and zone geometry is simplified once and cached — so the emitted state stays orders of magnitude smaller than the shape on screen.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | — | MapTiler API key **(required)** |
| `modelValue` | `MapRadiusState` | — | Full component state (`v-model`) |
| `modes` | `Mode[]` | `["radius", "polygon"]` | Which modes the toggle offers; one mode hides the toggle |
| `mode` | `Mode` | `"radius"` | Mode to start in |
| `center` | `[number, number]` | `[0, 20]` | Initial map centre `[lng, lat]` |
| `zoom` | `number` | `2` | Initial zoom level |
| `height` | `string` | `"500px"` | Map container height |
| `minRadius` | `number` | `0` | Minimum circle radius (km) |
| `maxRadius` | `number` | `Infinity` | Maximum circle radius (km) |
| `radiusStep` | `number` | `1` | Step of the radius input (km) |
| `radiusPolygonPoints` | `number` | `16` | Vertices used to approximate a circle |
| `locale` | `string` | `"en"` | UI language (`"en"` or `"fr"` built in) |
| `translations` | `Record<string, Record<string, string>>` | `{}` | Per-locale overrides for any label |
| `mapStyle` | `string` | — | MapTiler style URL; the API key is appended when missing |
| `geoOptions` | `MapRadiusGeoOptions` | — | Coordinate precision, simplification, territory splitting |
| `paintOptions` | `MapRadiusPaintOptions` | — | Layer colours, and the palette cycled through as zones are added |
| `interactiveOptions` | `MapRadiusInteractiveOptions` | — | `draggableCenter`, `draggableRadius`, `showRadiusTooltip` |

### Labels

Every string the component renders — placeholders, button labels, error text, accessible names — resolves through the translation layer. Override any of them per locale:

```vue
<MapRadius
  :translations="{
    en: { 'search.placeholder': 'Find a city…', 'mode.polygon': 'Area' },
  }"
/>
```

Keys: `search.placeholder`, `search.ariaLabel`, `search.loading`, `search.resultCount`, `info.noResults`, `info.nonPolygon`, `radius.label`, `radius.minMessage`, `radius.maxMessage`, `mode.radius`, `mode.polygon`, `mode.ariaLabel`, `map.ariaLabel`, `error.noApiKey`, `error.network`, `zone.remove`, `zone.loading`. `TranslationKey` types them, and an unknown key warns in dev.

## Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `MapRadiusState` | Any meaningful interaction — search select, drag end, radius commit, mode switch |
| `geometry` | `MapRadiusGeometry` | Alongside every model update, carrying the merged shape |
| `ready` | — | The map's `load` event fired and the instance can be driven |
| `error` | `MapRadiusError` | `{ source: "config" \| "geocoding-search" \| "geocoding-detail", message, cause? }` |
| `zone-added` / `zone-removed` | `MapRadiusZone` / `string` | A polygon zone entered or left the selection |
| `circle-added` / `circle-removed` | `MapRadiusCircleZone` / `string` | A circle entered or left the selection |
| `circle-selected` | `string \| null` | The circle the radius field edits changed |

## Exposed methods

```ts
const map = useTemplateRef("mapRadius")
map.value?.flyTo([2.35, 48.85], 12)
map.value?.getGeometry()   // the merged MultiPolygon, on demand
```

| Member | Type | Description |
|--------|------|-------------|
| `map` | `maplibregl.Map \| null` | The underlying MapLibre instance, once loaded |
| `flyTo` | `(center, zoom?) => void` | Animate the camera |
| `fitBounds` | `(bbox, padding?) => void` | Fit `[w, s, e, n]`, anti-meridian included |
| `resize` | `() => void` | Re-measure after the container changed size |
| `getGeometry` | `() => MapRadiusGeometry` | The merged shape without waiting for an event |

## Slots

Four named slots replace a part of the UI; each renders its default subcomponent when you pass nothing. Slot props are typed.

| Slot | Default | Slot props |
|------|---------|------------|
| `mode-toggle` | `VMPModeToggle` | `mode`, `radiusLabel`, `polygonLabel`, `disabled`, `switchMode` |
| `search-bar` | `VMPSearchBar` | `query`, `placeholder`, `results`, `loading`, `disabled`, `updateQuery`, `onSelect` |
| `zone-list` | `VMPZoneList` | `zones`, `removeZone`, `removeLabel`, `disabled`, `selectedId`, `selectZone` |
| `radius-input` | `VMPRadiusInput` | `radius`, `setRadius`, `label`, `step`, `minMessage`, `maxMessage`, `onBlur` |

## Styling

Colours and radii come from CSS custom properties, so a theme is a few lines:

```css
.vmr-map-radius {
  --vmr-primary-color: #2563eb;
  --vmr-error-color: #dc2626;
  --vmr-search-bg: #ffffff;
  --vmr-search-border: #d1d5db;
  --vmr-search-radius: 6px;
}
```

Map layer colours are props rather than CSS, since MapLibre paints them on a canvas — use `paintOptions`.

## Exports

The package's default export is the component. Alongside it:

### Geo utils

| Function | Description |
|----------|-------------|
| `circleToPolygon` | A true spherical small circle as a polygon ring |
| `toGeoJSON` | Wraps raw coordinates into a GeoJSON Feature |
| `trimCoordPrecision` | Truncates coordinate decimals, leaving properties alone |
| `ramerDouglasPeucker` | Simplifies a polyline |
| `simplifyPolygon` | RDP over a Polygon/MultiPolygon Feature, dropping rings that vanish |
| `haversineDistance` | Great-circle distance (km) |
| `destinationPoint` | Origin + distance + bearing → coordinate |
| `bearingTo` | Initial great-circle bearing between two coordinates |
| `circleBounds` | Bounding box `[w, s, e, n]` of a circle |
| `getPolygonBounds` | Bounding box of a Feature; returns a crossing box at the anti-meridian |
| `mergeToMultiPolygon` | Combines geometries into one MultiPolygon Feature |
| `splitOutlyingParts` | Separates a country's main landmass from its far, small parts |
| `hexToRgba` | Hex colour → `rgba()` string |
| `clampRadius` / `getValidationMessage` / `formatRadius` | Radius clamping, validation and localized display |

### Composables

| Composable | Returns | Description |
|------------|---------|-------------|
| `useGeoJSON` | `{ trimPrecision, simplify }` | Precision trimming and simplification |
| `useGeocoding` | `{ search, results, error, loading, fetchFeatureDetail }` | MapTiler Geocoding wrapper |
| `useTranslation` | `{ t }` | i18n over the built-in en/fr dictionaries; follows a locale ref |
| `useMap` | `UseMapReturn` | Map lifecycle — layers, markers, handles, tooltip |
| `buildStyleUrl` | `string` | Appends `?key=` to a style URL when missing |

### Types

`Mode`, `MapRadiusState`, `MapRadiusRadiusState`, `MapRadiusPolygonState`, `MapRadiusGeometry`, `MapRadiusError`, `MapRadiusZone`, `MapRadiusCircleZone`, `MapRadiusDisplayZone`, `GeocodingResult`, `MapRadiusGeoOptions`, `MapRadiusPaintOptions`, `MapRadiusInteractiveOptions`, `TranslationKey`, `SplitOutlyingPartsOptions`, `SplitOutlyingPartsResult`.

## Migrating from v1

> [!WARNING]
> **Do not use 2.0.0 — it is deprecated.** It pins `maplibre-gl@^5`, and every MapLibre 5
> release carries an unpatched critical XSS in `DOM.sanitize()`
> ([GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579)); the fix only
> exists in MapLibre 6. Upgrade to **2.1.0**, which requires `maplibre-gl@^6`. It is a
> minor release on purpose: a caret range `^2.0.0` picks it up on the next install, which
> is the point. Coming from 2.0.0, the two bullets marked *(2.1.0)* below are the whole
> migration — props, emits, slots, exposed methods and the `v-model` shape are unchanged.

- **MapLibre 6 is required** *(2.1.0)*. The peer range is now `maplibre-gl@^6`; MapLibre 5
  has an unpatched XSS in `DOM.sanitize()`, and no 5.x release fixes it. Run
  `npm install maplibre-gl@^6`.
- **You must call `setWorkerUrl()`** *(2.1.0)*. New in MapLibre 6 and easy to miss: skip it
  and the map renders blank with no error. See
  [Point MapLibre at its worker](#point-maplibre-at-its-worker).
- **MapLibre 6 requires WebGL2** *(2.1.0)*, having dropped WebGL1. Its
  [v5→v6 migration guide](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/)
  covers the rest, which applies to your own map code rather than to this component.
- **The package is ESM only** *(2.1.0)*. MapLibre 6 ships no UMD or CJS build, so the
  `dist/vue-map-radius.umd.cjs` bundle — which externalised a `maplibregl` global that
  no longer exists — is gone, along with the `main` field and the `require` export
  condition. `import` is unchanged. `require()` still resolves, but to the ESM build, so
  it needs Node 22.12+ (or a bundler that handles `require` of ESM); MapLibre 6 itself
  carries the same requirement.
- **State is a discriminated union.** `center` / `radiusKm` / `name` / `bearing` at the top level are gone; read `state.circles` in radius mode and `state.zones` in polygon mode.
- **Geometry left the model.** `state.polygon` is gone — listen to `@geometry` or call `getGeometry()`.
- **Radius mode holds many circles.** Selecting a search result adds one instead of moving the only one.
- **Label option bags are gone.** `searchOptions`, `radiusOptions`, `modeToggleOptions` and `zoneListOptions` are replaced by `translations` keys; `mapOptions.style` is now the `mapStyle` prop.
- **`useRadius` is gone**, replaced by the pure `clampRadius` / `getValidationMessage` / `formatRadius`.
- **MapLibre's stylesheet is no longer bundled** — import `maplibre-gl/dist/maplibre-gl.css` yourself.

## Contributing

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/waldeck-dev/vue-map-radius/issues). If you'd like to fix something or add a feature, feel free to open a pull request — contributions of all kinds are appreciated.

## Development

```bash
cp .env.example .env   # add your VITE_MAPTILER_KEY

npm run dev            # playground at docs/
npm test               # unit + component tests
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

## License

[MIT](LICENSE)
