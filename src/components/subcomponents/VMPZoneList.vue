<script setup lang="ts">
defineProps<{
  zones: { id: string; name: string; color?: string }[]
  removeLabel: string
  /** Only set in radius mode, where a chip selects which circle the input edits. */
  selectable?: boolean
  selectedId?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
  (e: 'select', id: string): void
}>()
</script>

<template>
  <div
    class="vmr-zone-list"
    role="list"
  >
    <span
      v-for="zone in zones"
      :key="zone.id"
      class="vmr-zone-chip"
      :class="{ 'vmr-zone-chip--selected': zone.id === selectedId }"
      role="listitem"
      :style="zone.color ? { borderColor: zone.color } : undefined"
    >
      <!-- A button, not a clickable span: the chip is how a keyboard user picks
           which circle the radius field edits. -->
      <component
        :is="selectable ? 'button' : 'span'"
        class="vmr-zone-chip-select"
        v-bind="selectable ? { type: 'button', disabled, 'aria-pressed': zone.id === selectedId } : {}"
        @click="selectable && emit('select', zone.id)"
      >
        <span
          class="vmr-zone-chip-swatch"
          :style="{ backgroundColor: zone.color }"
          aria-hidden="true"
        />
        <span class="vmr-zone-chip-name">{{ zone.name }}</span>
      </component>
      <button
        type="button"
        class="vmr-zone-chip-remove"
        :aria-label="`${removeLabel}: ${zone.name}`"
        :disabled="disabled"
        @click="emit('remove', zone.id)"
      >
        &times;
      </button>
    </span>
  </div>
</template>

<style scoped>
.vmr-zone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.vmr-zone-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border: 1px solid var(--vmr-search-border, #d1d5db);
  border-radius: 999px;
  background: var(--vmr-search-bg, #ffffff);
  font-size: 13px;
  color: #374151;
}
.vmr-zone-chip--selected {
  box-shadow: 0 0 0 2px var(--vmr-primary-color, #2563eb);
}
.vmr-zone-chip-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: inherit;
}
button.vmr-zone-chip-select {
  cursor: pointer;
}
.vmr-zone-chip-select:focus-visible,
.vmr-zone-chip-remove:focus-visible {
  outline: 2px solid var(--vmr-primary-color, #2563eb);
  outline-offset: 2px;
}
.vmr-zone-chip-swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--vmr-primary-color, #3b82f6);
}
.vmr-zone-chip-name {
  line-height: 1.2;
}
.vmr-zone-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #6b7280;
  padding: 0 2px;
  opacity: 0.8;
}
.vmr-zone-chip-remove {
  min-width: 24px;
  min-height: 24px;
}
.vmr-zone-chip-remove:hover {
  opacity: 1;
  color: var(--vmr-primary-color, #2563eb);
}
.vmr-zone-chip-remove:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
