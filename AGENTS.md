# vue-map-radius

**Pre-implementation spec.** SPEC.md — authoritative design doc (Vue 3 + Composition API, TypeScript, MapLibre GL JS, MapTiler, Vite, Vitest). `.env` requires `VITE_MAPTILER_KEY`; copy `.env.example` to `.env`.

## Commands

```
npm run dev          # Vite dev server (entry: dev/main.ts)
npm run build        # Build library (vite + vite-plugin-dts with rollupTypes)
npm run test         # Vitest (run all)
npm run test -- <filter>   # Single test file (e.g., "useGeocoding")
```

No separate lint/typecheck script — `npm run build` catches type errors via dts plugin. TS ~6.0.2 with `@vue/tsconfig`. `@/` path alias maps to `src/`.

## Architecture

- **SPEC.md** is the single source of truth; actual code has these verified divergences:
  - Subcomponent files use `VMP` prefix (`VMPSearchBar.vue`, `VMPMapContainer.vue`, etc.)
  - `modes` prop (`Mode[]`, default `['radius', 'polygon']`) — `mode` (singular) selects active
  - `radiusStep`, `interactiveOptions`, `geoOptions` props added beyond spec
  - Polygon admin types: `country,region,subregion,county` (not spec's list)
  - Geocoding language param hardcoded `'en'` (not locale-driven)
  - `haversineDistance`, `destinationPoint`, `circleToPolygon`, `toGeoJSON`, `trimCoordPrecision`, `ramerDouglasPeucker`, `simplifyPolygon` exported from `src/index.ts`
  - `useGeoJSON` composable also exported
- File layout matches SPEC.md's tree (components/, composables/, utils/, locales/, types/)
- CSS: `--vmr-*` custom properties, `vmr-*` BEM-like class names (scoped)
- Circle: 64-point polygon via `circleToPolygon()` in `utils/geo.ts`
- Polygon: two-step fetch (autocomplete no geometry ? detail by ID with full geometry)
- 300ms search debounce in `MapRadius.vue`
- `buildStyleUrl()` helper (internal to `useMap.ts`) appends `?key=` if missing
- **State management:** `v-model` via `MapRadiusState` interface — no confirm button. Emits `update:modelValue` on every meaningful interaction (search select, drag end, radius blur, mode switch). Accepts `modelValue` prop for full rehydration on mount/prop change.
- **Rehydration:** `hydrate()` sets internal state from `modelValue` on mount (via `immediate` + `deep` watcher). Rendering defers if map isn't ready yet — a `mapReady` watcher triggers render once the map's `load` event fires.

## Git

- Conventional Commits style (feat:, fix:, refactor:, chore:, etc.)
- `.gitignore` lists `SPEC.md`, `TODO.md`, `opencode.json` — these are local-only, NOT committed
- Only `dist/` is published (via `"files": ["dist"]` in package.json)

## Test patterns (Vitest)

- Tests co-located with source files (`useGeocoding.test.ts` alongside `useGeocoding.ts`)
- `useGeocoding.test.ts` mocks `globalThis.fetch` directly — pattern for API-calling composables
- Test environment: `jsdom` (configured in `vite.config.ts`)
- No integration tests — pure unit tests for composables and utils

## Bundle

- `vue` and `maplibre-gl` are external peer dependencies (not bundled)
- `vite-plugin-dts` with `rollupTypes: true` rolls all types into a single `dist/src/index.d.ts`
- Entry: `src/index.ts` — exports component as default + types + geo utils + `useGeoJSON`
