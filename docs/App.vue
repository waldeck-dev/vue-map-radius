<script setup lang="ts">
import { ref, computed } from 'vue'
import MapRadius from '../src/components/MapRadius.vue'
import type { MapRadiusState } from '../src/types'

const apiKey = import.meta.env.VITE_MAPTILER_KEY

const state = ref<MapRadiusState>({
  mode: 'radius',
  center: null,
  radiusKm: 20,
  polygon: null,
  name: null
})

const stateJson = computed(() => JSON.stringify(state.value, null, 2))

const center: [number, number] = [2.2137, 46.2276]
const zoom = 5

const githubMarkSrc = '/github-mark.svg'
</script>

<template>
  <div class="demo">
    <header class="demo-header">
      <div class="demo-header-inner">
        <svg
          class="demo-logo"
          viewBox="0 0 16 16"
          width="28"
          height="28"
          aria-hidden="true"
        >
          <circle
            cx="8"
            cy="8"
            r="1.5"
            fill="#3b82f6"
          />
          <circle
            cx="8"
            cy="8"
            r="3.5"
            fill="none"
            stroke="#3b82f6"
            stroke-width="1.2"
          />
          <circle
            cx="8"
            cy="8"
            r="5.5"
            fill="none"
            stroke="#3b82f6"
            stroke-width="1"
          />
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke="#3b82f6"
            stroke-width="0.8"
            opacity="0.5"
          />
        </svg>
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
        href="https://github.com/waldeck-dev/vue-map-radius"
        target="_blank"
        title="GitHub"
      >
        <img
          :src="githubMarkSrc"
          width="20"
          height="20"
          alt="GitHub"
        >
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
  display: block;
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
  background: #e2e8f0;
}
.demo-gh:hover img {
  filter: brightness(0.3);
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


