<script setup lang="ts">
import type { Mode } from '../../types'

defineProps<{
  mode: Mode
  radiusLabel: string
  polygonLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:mode', val: Mode): void
}>()

function setMode(m: Mode) {
  emit('update:mode', m)
}
</script>

<template>
  <div class="vmr-mode-toggle">
    <button
      class="vmr-mode-btn"
      :class="{ 'vmr-mode-btn--active': mode === 'radius' }"
      @click="setMode('radius')"
    >
      {{ radiusLabel }}
    </button>
    <button
      class="vmr-mode-btn"
      :class="{ 'vmr-mode-btn--active': mode === 'polygon' }"
      @click="setMode('polygon')"
    >
      {{ polygonLabel }}
    </button>
  </div>
</template>

<style scoped>
.vmr-mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--vmr-search-border, #d1d5db);
  border-radius: var(--vmr-search-radius, 6px);
  overflow: hidden;
}
.vmr-mode-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: var(--vmr-search-bg, #ffffff);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  transition: background 0.15s, color 0.15s;
}
.vmr-mode-btn:not(:last-child) {
  border-right: 1px solid var(--vmr-search-border, #d1d5db);
}
.vmr-mode-btn--active {
  background: var(--vmr-primary-color, #3b82f6);
  color: #ffffff;
}
</style>
