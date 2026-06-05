<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMap } from '../../composables/useMap'

const props = defineProps<{
  apiKey: string
  center: [number, number]
  zoom: number
  height: string
}>()

const containerId = 'vmr-map-' + Math.random().toString(36).slice(2, 8)
const containerRef = ref<HTMLDivElement>()

const {
  mapReady,
  init,
  updateCircle,
  updatePolygon,
  setVisibility,
  fitBounds,
  flyTo,
  clearCircle,
  clearPolygon,
  destroy,
} = useMap(containerId, props.apiKey, props.center, props.zoom)

onMounted(() => {
  init()
})

defineExpose({
  mapReady,
  updateCircle,
  updatePolygon,
  setVisibility,
  fitBounds,
  flyTo,
  clearCircle,
  clearPolygon,
  destroy,
})
</script>

<template>
  <div
    :id="containerId"
    ref="containerRef"
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
