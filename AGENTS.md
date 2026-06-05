# vue-map-radius

**Pre-implementation spec.** No source code, package.json, or build config exists. All architecture, props, API endpoints, and component tree are defined in SPEC.md ï¿½ read it before writing any code.

## Single source of truth

- SPEC.md ï¿½ authoritative design doc (Vue 3 + Composition API, TypeScript, MapLibre GL JS, MapTiler, Vite, Vitest)
- .env ï¿½ contains `VITE_MAPTILER_KEY`. Copy `.env.example` to `.env` and set your key.

## Implementation rules

- Follow the exact file layout in SPEC.md ï¿½ every component, composable, util, and type file is specified with its exports and signatures.
- CSS custom properties use vmr- prefix (e.g. --vmr-primary-color, --vmr-search-bg). All component classes use vmr- prefix (BEM-like).
- Circle rendering: 64-point polygon approximation via circleToPolygon() in utils/geo.ts.
- MapTiler geocoding API endpoints and query parameters are precisely specified ï¿½ do not guess them.
- Polygon mode requires a two-step fetch: autocomplete (no geometry) ? detail by ID (full geometry).
- Test with Vitest (npm run test). Test files live under src/ alongside implementation (Vitest). Run with npm run test.

## Setup (from spec)

```
npm install
npm run dev          # Vite dev server with demo app
npm run build        # Build library
npm run test         # Vitest
```

The demo app goes in dev/App.vue + dev/main.ts and reads the API key from `import.meta.env.VITE_MAPTILER_KEY`.

## Commit rules

- Make very frequent commits using [Conventional Commits](https://www.conventionalcommits.org/) style (e.g., feat:, fix:, refactor:, chore:, docs:, test:). Each logical change should be its own commit ï¿½ prefer 10+ small commits over one large one.
## Developer Experience (DX)

### TypeScript strictness
- Avoid `any` in composables and utils — define proper interfaces (e.g. `MapTilerFeature` for geocoding API responses).
- Export all public types from `src/index.ts` so consumers can type their usage.

### Runtime guardrails
- Validate `apiKey` presence via `console.warn('[vue-map-radius] ...')`.
- Add runtime prop checks (e.g. negative `radiusStep`).
- Catch all async errors and surface via `errorMsg` ref -> `vmr-error-msg`.

### Slot ergonomics
- Every slot provides typed scoped bindings so consumers can fully replace UI without losing internal state.
- Always include fallback default content in slots.

### Exposed component API
- Use `defineExpose` for imperative methods (`flyTo`, `fitBounds`, `clearCircle`, etc.).

### CSS theming
- All colors/radii use `--vmr-*` custom properties with sensible fallbacks.
- Never hardcode a color without a corresponding custom property + fallback.

### Localization
- Built-in `en` / `fr` with user override via `translations` prop.
- Always use the `t()` composable for UI strings.

### Loading / empty / error states
- Every async operation must handle all three visual states.
- Currently: search has loading + empty + error; polygon detail fetch has loading + error.

### Vue DevTools
- SFC filenames are auto-detected by Vue 3 — keep component names descriptive.
- Use `defineExpose` to surface internal state where useful for debugging.

### Accessibility
- All interactive elements must have appropriate ARIA attributes (`aria-label`, `aria-expanded`, `role`, etc.).
- Form inputs must be associated with labels.

### Bundle
- Keep `maplibre-gl` and `vue` as external peer dependencies.
- Re-export only what consumers need from `src/index.ts`.

