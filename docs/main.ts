import { createApp } from "vue";
// The library no longer inlines MapLibre's stylesheet, so the host app imports
// it — exactly what a consumer of this package has to do.
import "maplibre-gl/dist/maplibre-gl.css";
import App from "./App.vue";

createApp(App).mount("#app");
