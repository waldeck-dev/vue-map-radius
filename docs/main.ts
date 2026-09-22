import { createApp } from "vue";
import { setWorkerUrl } from "maplibre-gl";
// MapLibre 6 finds its worker through `import.meta.url`, which no bundler
// resolves to the real file, so every consumer calls setWorkerUrl() once —
// exactly what this playground is here to demonstrate. `?worker&url` and not
// `?url`: the worker imports a sibling maplibre-gl-shared.mjs that a bare
// `?url` would not emit, and tiles would silently never parse.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
// The library no longer inlines MapLibre's stylesheet, so the host app imports
// it — exactly what a consumer of this package has to do.
import "maplibre-gl/dist/maplibre-gl.css";
import App from "./App.vue";

setWorkerUrl(workerUrl);

createApp(App).mount("#app");
