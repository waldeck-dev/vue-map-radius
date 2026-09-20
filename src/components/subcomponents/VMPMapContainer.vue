<script setup lang="ts">
import { onMounted, useId } from 'vue'
import { useMap } from '../../composables/useMap'
import type { MapRadiusPaintOptions } from '../../types'

const props = defineProps<{
  apiKey: string
  center: [number, number]
  zoom: number
  height: string
  mapStyle?: string
  paintOptions?: MapRadiusPaintOptions
}>()

const containerId = useId()

// Expose the whole map surface rather than a hand-copied subset: one list that
// cannot drift from what useMap actually returns.
const map = useMap(containerId, props.apiKey, props.center, props.zoom, props.mapStyle, props.paintOptions)

onMounted(() => {
  map.init()
})

defineExpose(map)
</script>

<template>
  <div
    :id="containerId"
    class="vmr-map-wrapper"
    :style="{ height }"
    role="application"
    aria-label="Map"
  />
</template>

<style scoped>
.vmr-map-wrapper {
  width: 100%;
  min-height: 300px;
  border-radius: var(--vmr-search-radius, 6px);
  overflow: hidden;
}
</style>
