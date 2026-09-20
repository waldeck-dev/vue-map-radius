<script setup lang="ts">
import type { Mode } from '../../types'

const props = defineProps<{
  mode: Mode
  radiusLabel: string
  polygonLabel: string
  /** Accessible name for the radiogroup. */
  groupLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:mode', val: Mode): void
}>()

const ORDER: Mode[] = ['radius', 'polygon']

function setMode(m: Mode) {
  if (props.disabled) return
  emit('update:mode', m)
}

/**
 * A radiogroup is one tab stop: arrows move between the radios and check as
 * they go, so `tabindex` follows the checked one (roving tabindex).
 */
function onKeydown(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
    : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
      : 0
  if (!step || props.disabled) return
  e.preventDefault()
  const index = (ORDER.indexOf(props.mode) + step + ORDER.length) % ORDER.length
  const group = e.currentTarget as HTMLElement
  group.querySelectorAll('button')[index]?.focus()
  setMode(ORDER[index])
}
</script>

<template>
  <div
    class="vmr-mode-toggle"
    role="radiogroup"
    :aria-label="groupLabel"
    @keydown="onKeydown"
  >
    <button
      v-for="m in ORDER"
      :key="m"
      type="button"
      class="vmr-mode-btn"
      :class="{ 'vmr-mode-btn--active': mode === m }"
      role="radio"
      :aria-checked="mode === m"
      :tabindex="mode === m ? 0 : -1"
      :disabled="disabled"
      @click="setMode(m)"
    >
      {{ m === 'radius' ? radiusLabel : polygonLabel }}
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
  background: var(--vmr-primary-color, #2563eb);
  color: #ffffff;
}
.vmr-mode-btn:focus-visible {
  outline: 2px solid var(--vmr-primary-color, #2563eb);
  outline-offset: -2px;
}
.vmr-mode-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
