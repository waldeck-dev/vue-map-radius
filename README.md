# vue-map-radius

[![npm version](https://img.shields.io/npm/v/vue-map-radius)](https://www.npmjs.com/package/vue-map-radius)

A Vue 3 component for drawing radius circles and polygons on [MapTiler](https://www.maptiler.com/) (MapLibre GL JS) maps.

## Motivations

I built this over a weekend because my team needed a map radius/polygon picker — a low-priority feature that kept getting deprioritised. It was also a chance to try out two things I’d been curious about: **vibe coding** (letting an AI assistant drive most of the implementation) and [**OpenCode**](https://opencode.ai/docs/en/) with the **Big Pickle** model as the engine behind it. The result is a real, shippable component that solved the original need and doubled as a fun experiment in AI-assisted development.

## Features

- **Radius mode** — click to center, adjust distance with an input or by dragging
- **Polygon mode** — search & select administrative boundaries (country, region, subregion, county)
- **Dual mode** — toggle between radius and polygon via a mode switcher
- **v-model support** — full state management via `MapRadiusState`
- **TypeScript** — full type definitions included
- **Geocoding** — powered by MapTiler Geocoding API
- **Lightweight** — only 29 kB (JS) + 72 kB (CSS) gzipped

## Installation

```bash
npm install vue-map-radius
```

You also need **vue** and **maplibre-gl** as peer dependencies:

```bash
npm install vue maplibre-gl
```

## Quick Start

```vue
<script setup lang="ts">
import MapRadius from "vue-map-radius"
import "vue-map-radius/dist/vue-map-radius.css"
import { ref } from "vue"

const state = ref({
  center: [2.3522, 48.8566], // lng, lat
  zoom: 10,
  mode: "radius",
  radius: 5000,
})
</script>

<template>
  <MapRadius
    v-model="state"
    apiKey="YOUR_MAPTILER_API_KEY"
    style="width: 100%; height: 500px"
  />
</template>
```

## `MapRadiusState`

```ts
interface MapRadiusState {
  mode: 'radius' | 'polygon'
  center: [number, number] | null
  radiusKm: number
  polygon: GeoJSON.Feature | null
  name: string | null
  bearing?: number
}
```

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `"radius" \| "polygon"` | Active drawing mode |
| `center` | `[number, number] \| null` | Map center `[lng, lat]` |
| `radiusKm` | `number` | Circle radius in kilometers |
| `polygon` | `GeoJSON.Feature \| null` | Selected polygon feature |
| `name` | `string \| null` | Search result place name |
| `bearing` | `number` _(optional)_ | Map bearing in degrees |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `MapRadiusState` | — | Full component state (v-model) |
| `apiKey` | `string` | — | MapTiler API key **(required)** |
| `modes` | `Mode[]` | `["radius", "polygon"]` | Available modes |
| `mode` | `Mode` | — | Active mode (overrides default) |
| `radiusStep` | `number` | `1000` | Step for radius input (meters) |
| `interactiveOptions` | `Partial<MapRadiusInteractiveOptions>` | — | Override interactive layer paint/layout |
| `geoOptions` | `Partial<MapRadiusGeoOptions>` | — | Override simplification / precision settings |

## Exports

In addition to the default component export (`MapRadius`), the package exports:

### Geo utils

| Function | Description |
|----------|-------------|
| `circleToPolygon` | Converts a center point and radius into a 64-point polygon array |
| `toGeoJSON` | Wraps raw geometry coordinates into a GeoJSON Feature |
| `trimCoordPrecision` | Truncates coordinate decimals in a GeoJSON object |
| `ramerDouglasPeucker` | Simplifies a polyline using the Ramer-Douglas-Peucker algorithm |
| `simplifyPolygon` | Applies RDP simplification to a Polygon/MultiPolygon Feature |
| `haversineDistance` | Returns the great-circle distance (km) between two coordinates |
| `destinationPoint` | Calculates destination coordinate given origin, distance, and bearing |

### Composables

| Composable | Return | Description |
|------------|--------|-------------|
| `useGeoJSON` | `{ trimPrecision, simplify }` | Coordinate precision trimming and polygon simplification |
| `useGeocoding` | `{ search, results, error, loading, fetchFeatureDetail }` | MapTiler Geocoding API wrapper for autocomplete search and detail lookup |
| `useTranslation` | `{ t }` | Lightweight i18n with built-in en/fr locales and custom overrides |
| `useRadius` | `{ radiusKm, clampedRadius, validationMessage, setRadius, setCenter, center, clamp }` | Radius state management with min/max clamping and validation |
| `useMap` | `UseMapReturn` | MapLibre GL map lifecycle — init, circle/polygon layers, markers, handles, tooltip |
| `buildStyleUrl` | `string` | Appends `?key=` to a MapTiler style URL if not already present |

### Types

| Type | Description |
|------|-------------|
| `Mode` | `'radius' \| 'polygon'` |
| `MapRadiusState` | Full v-model state interface |
| `GeocodingResult` | Normalized geocoding result with id, text, placeName, center, bbox, geometry |
| `MapRadiusSearchOptions` | Search bar UI text customization (placeholder, noResultsText, loadingText) |
| `MapRadiusRadiusOptions` | Radius input label customization |
| `MapRadiusModeToggleOptions` | Mode toggle button labels (radiusLabel, polygonLabel) |
| `MapRadiusMapOptions` | Map style URL override |
| `MapRadiusGeoOptions` | Coordinate precision and simplification tolerance settings |
| `MapRadiusInteractiveOptions` | Interaction feature toggles (draggableCenter, draggableRadius, showRadiusTooltip) |

### Slots

`MapRadius` provides three named slots. Each renders a default subcomponent when no custom content is provided. Slot props allow accessing internal state and methods.

| Slot | Default subcomponent | Slot props | Purpose |
|------|---------------------|------------|---------|
| `mode-toggle` | `VMPModeToggle` | `mode`, `radiusLabel`, `polygonLabel`, `switchMode` | Toggles between radius and polygon modes |
| `search-bar` | `VMPSearchBar` | `query`, `placeholder`, `results`, `loading`, `updateQuery`, `onSelect` | Geocoding search input with autocomplete dropdown |
| `radius-input` | `VMPRadiusInput` | `radius`, `setRadius`, `label`, `step`, `minMessage`, `maxMessage`, `onBlur` | Numeric input for circle radius in km |

## Contributing

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/waldeck-dev/vue-map-radius/issues). If you'd like to fix something or add a feature, feel free to open a pull request — contributions of all kinds are appreciated.

## Development

```bash
# Copy environment file
cp .env.example .env   # add your VITE_MAPTILER_KEY

# Start dev server
npm run dev

# Run tests
npm test

# Build library
npm run build

# Lint
npm run lint
```

## License

[MIT](LICENSE)
