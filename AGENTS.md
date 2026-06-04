# vue-map-radius

**Pre-implementation spec.** No source code, package.json, or build config exists. All architecture, props, API endpoints, and component tree are defined in SPEC.md � read it before writing any code.

## Single source of truth

- SPEC.md � authoritative design doc (Vue 3 + Composition API, TypeScript, MapLibre GL JS, MapTiler, Vite, Vitest)
- .env � contains `VITE_MAPTILER_KEY`. Copy `.env.example` to `.env` and set your key.

## Implementation rules

- Follow the exact file layout in SPEC.md � every component, composable, util, and type file is specified with its exports and signatures.
- CSS custom properties use vmr- prefix (e.g. --vmr-primary-color, --vmr-search-bg). All component classes use vmr- prefix (BEM-like).
- Circle rendering: 64-point polygon approximation via circleToPolygon() in utils/geo.ts.
- MapTiler geocoding API endpoints and query parameters are precisely specified � do not guess them.
- Polygon mode requires a two-step fetch: autocomplete (no geometry) ? detail by ID (full geometry).
- Test with Vitest (npm run test). No test files exist yet; create them under src/ alongside implementation.

## Setup (from spec)

```
npm install
npm run dev          # Vite dev server with demo app
npm run build        # Build library
npm run test         # Vitest
```

The demo app goes in dev/App.vue + dev/main.ts and reads the API key from `import.meta.env.VITE_MAPTILER_KEY`.

## Commit rules

- Make very frequent commits using [Conventional Commits](https://www.conventionalcommits.org/) style (e.g., feat:, fix:, refactor:, chore:, docs:, test:). Each logical change should be its own commit � prefer 10+ small commits over one large one.