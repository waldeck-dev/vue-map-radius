<script setup lang="ts">
import type { Mode } from '../../types'

const props = defineProps<{
  mode: Mode
  radiusLabel: string
  polygonLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:mode', val: Mode): void
}>()

function setMode(m: Mode) {
  if (props.disabled) return
  emit('update:mode', m)
}
</script>

<template>
  <div
    class="vmr-mode-toggle"
    role="radiogroup"
    aria-label="Map mode"
  >
    <button
      class="vmr-mode-btn"
      :class="{ 'vmr-mode-btn--active': mode === 'radius' }"
      role="radio"
      :aria-checked="mode === 'radius'"
      :disabled="disabled"
      @click="setMode('radius')"
    >
      {{ radiusLabel }}
    </button>
    <button
      class="vmr-mode-btn"
      :class="{ 'vmr-mode-btn--active': mode === 'polygon' }"
      role="radio"
      :aria-checked="mode === 'polygon'"
      :disabled="disabled"
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
.vmr-mode-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
