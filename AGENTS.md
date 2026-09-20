# vue-map-radius

A published Vue 3 library: a map component for picking radius circles and administrative polygons on MapTiler (MapLibre GL JS). `.env` requires `VITE_MAPTILER_KEY`; copy `.env.example` to `.env`.

README.md documents the public API and is kept accurate — treat a divergence between it and `src/` as a bug in one of them. `SPEC.md` (gitignored, local-only) is the original pre-implementation design doc and is now **historical**: v2 deliberately departs from it.

## Commands

```
npm run dev                # Vite dev server (entry: docs/main.ts)
npm run build              # Build library (vite + vite-plugin-dts w/ cleanVueFileName + staticImport)
npm run test               # Vitest (run all)
npm run test -- <filter>   # Single test file (e.g., "useGeocoding")
npm run test:coverage      # Vitest + v8 coverage (text + html)
npm run lint               # ESLint (src/ docs/)
npm run typecheck          # vue-tsc --build
npm run size               # gzipped JS + CSS of the last build
```

`typecheck` must stay `vue-tsc --build`: the root tsconfig has `files: []` plus project references, so `--noEmit` silently checks **zero files**.

ESLint with Vue 3 + TypeScript rules (flat config in eslint.config.js).

## Architecture

- Layout: `components/` (+ `components/subcomponents/`, `VMP` prefix), `composables/`, `utils/`, `locales/`, `types/`
- **Model vs. geometry.** `MapRadiusState` is a discriminated union on `mode` holding only what the user chose (`circles` / `zones`). The merged `MultiPolygon` is derived output — it travels on the `geometry` event and `getGeometry()`, never in the model. Keeping it out is what makes the model round-trippable and small.
- **Radius mode is multi-circle**, every circle simultaneously draggable by centre or handle; `bearing` persists the handle's angle across a round trip. Polygon mode merges multiple administrative zones.
- **Rehydration:** `hydrate()` runs from an `immediate` (not `deep`) watcher on `modelValue`; `lastEmitted` identity + `toRaw()` suppresses our own v-model echo — a parent `ref` wraps the emitted object in a proxy, so the raw comparison is required. Rendering defers until the map's `load` event via a `mapReady` watcher.
- **`zones` is a `shallowRef`**, and every mutation replaces the array. A country MultiPolygon holds 10⁴–10⁵ positions; a deep ref proxies each one and simplification then runs through a Proxy trap per coordinate (measured: 367 ms → 10 ms). Never mutate a zone in place.
- Simplified zone geometry is cached per raw geometry in a `WeakMap`, keyed by tolerance.
- **All labels resolve through `t()`** — there is no second mechanism. Option bags carry behaviour only (`geoOptions`, `paintOptions`, `interactiveOptions`). `TranslationKey` is derived from `locales/en.ts`, so a missing key in `fr.ts` is a type error.
- Circle: spherical small circle via `circleToPolygon()` in `utils/geo.ts`, `radiusPolygonPoints` vertices (default 16)
- Polygon: two-step fetch (autocomplete without geometry → detail by id with full geometry); admin types `country,region,subregion,county`; geocoding `language` follows the `locale` prop
- 300ms search debounce in `MapRadius.vue`
- `buildStyleUrl()` (in `useMap/index.ts`) appends `?key=` if missing
- The map surface is **derived, not restated**: `UseMapReturn` is built with `Omit`/`&` from what `useMapLayers` and `useMapMarkers` return, and `VMPMapContainer` re-exposes it wholesale. Adding a map command needs no second declaration.
- CSS: `--vmr-*` custom properties (`primary-color`, `error-color`, `search-bg`, `search-border`, `search-radius`), `vmr-*` BEM-like class names, scoped

## Accessibility

Contracts worth not regressing:

- The combobox role and its `aria-expanded` / `aria-controls` / `aria-activedescendant` live on the `<input>`, not a wrapper — that is where focus is.
- Zone chips are `<button>`s with `aria-pressed` when `selectable` (radius mode); a keyboard user selects a circle that way.
- The mode toggle is a `radiogroup` with a roving tabindex and arrow keys.
- Every id comes from `useId()`. Two maps on one page must not share a `for`/`id`.
- Defaults `#2563eb` / `#dc2626` are contrast-driven; `:focus-visible` rings are deliberate.

## Git

- Conventional Commits style (feat:, fix:, refactor:, chore:, etc.)
- `.gitignore` lists `SPEC.md`, `TODO.md`, `opencode.json` — local-only, NOT committed
- Only `dist/` is published (via `"files": ["dist"]`)

## Test patterns (Vitest)

- Tests co-located with source (`useGeocoding.test.ts` alongside `useGeocoding.ts`)
- `useGeocoding.test.ts` mocks `globalThis.fetch` directly — the pattern for API-calling composables
- Component tests mount with `@vue/test-utils`; `MapRadius.test.ts` stubs `MapContainer` with a `defineComponent` that `expose`s the same surface, so no MapLibre, WebGL or network is involved
- Environment: `jsdom` (configured in `vite.config.ts`)

## Bundle

- `vue` and `maplibre-gl` are external peer dependencies; MapLibre's stylesheet is **not** bundled (consumers import it)
- `@types/geojson` is a runtime `dependency`, not a devDependency: the published `.d.ts` files reference it
- `vite-plugin-dts` emits individual `.d.ts` files mirroring `src/` (v5 renamed `rollupTypes` → `bundleTypes`, which needs `@microsoft/api-extractor` and handles Vue SFC types poorly; `cleanVueFileName` + `staticImport` are used instead). `entryRoot` puts them at the root of `dist/`, which is what `exports` points at — `scripts/check-package.mjs` guards that.
- Entry: `src/index.ts` — component as default, plus types, geo/radius utils and composables
