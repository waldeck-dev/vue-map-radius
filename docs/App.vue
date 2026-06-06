<script setup lang="ts">
import { ref, computed } from 'vue'
import MapRadius from '../src/components/MapRadius.vue'
import type { MapRadiusState } from '../src/types'

const apiKey = import.meta.env.VITE_MAPTILER_KEY

const state = ref<MapRadiusState>({
  mode: 'radius',
  center: null,
  radiusKm: 0,
  polygon: null,
  name: null
})

const stateJson = computed(() => JSON.stringify(state.value, null, 2))

const center: [number, number] = [2.2137, 46.2276]
const zoom = 5
</script>

<template>
  <div class="demo">
    <header class="demo-header">
      <div class="demo-header-inner">
        <span class="demo-logo">◎</span>
        <div>
          <h1 class="demo-title">
            vue-map-radius
          </h1>
          <p class="demo-subtitle">
            Radius &amp; polygon map component
          </p>
        </div>
      </div>
      <a
        class="demo-gh"
        href="https://github.com/anomalyco/map-radius"
        target="_blank"
        title="GitHub"
      >
        <svg
          viewBox="0 0 16 16"
          width="20"
          height="20"
          fill="currentColor"
        ><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
      </a>
    </header>

    <div class="demo-map">
      <MapRadius
        v-model="state"
        :api-key="apiKey"
        :center="center"
        :zoom="zoom"
        :modes="['radius', 'polygon']"
        :min-radius="0"
        :max-radius="1000"
        :radius-step="1"
        locale="en"
        height="520px"
      />
    </div>

    <div class="demo-panel">
      <div class="demo-panel-header">
        <span class="demo-panel-title">Emitted <code>MapRadiusState</code></span>
      </div>
      <pre class="demo-json">{{ stateJson }}</pre>
    </div>

    <footer class="demo-footer">
      <span>Vue 3 + MapLibre GL JS + MapTiler</span>
      <span>v0.1.0</span>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
}

.demo {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.demo-header-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

.demo-logo {
  font-size: 28px;
  color: #0284c7;
  line-height: 1;
}

.demo-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.demo-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
}

.demo-gh {
  color: #64748b;
  transition: color 0.15s;
  display: flex;
  padding: 6px;
  border-radius: 6px;
}

.demo-gh:hover {
  color: #0f172a;
  background: #e2e8f0;
}

.demo-map {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.demo-panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.demo-panel-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.demo-panel-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.demo-panel-title code {
  font-size: 12px;
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 3px;
  color: #0284c7;
}

.demo-json {
  margin: 0;
  padding: 14px 16px;
  font-size: 12px;
  line-height: 1.6;
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
  color: #334155;
  background: #f8fafc;
  overflow-x: auto;
  white-space: pre;
}

.demo-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
}

.vmr-map-radius {
  gap: 12px;
  padding: 16px;
  margin: 8px;
  background: transparent;
}
</style>


