<script setup lang="ts">
import MapRadius from '../src/components/MapRadius.vue'

function onConfirm(feature: any) {
  console.log('Confirmed feature:', feature)
}
</script>

<template>
  <MapRadius
    api-key="HvOAhdmNWKWQ2xN55ls3"
    :center="[2.2137, 46.2276]"
    :zoom="5"
    :modes="['radius']"
    :min-radius="0"
    :max-radius="1000"
    locale="en"
    height="600px"
    :geo-options="{ coordPrecision: 4, simplifyTolerance: 0.03 }"
    @confirm="onConfirm"
  />
</template>

<style>
body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f3f4f6;
}

.vmr-map-radius {
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border-radius: var(--vmr-search-radius, 6px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
</style>