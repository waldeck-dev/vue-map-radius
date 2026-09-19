<script setup lang="ts">
defineProps<{
  zones: { id: string; name: string; color?: string }[]
  removeLabel: string
  disabled?: boolean
  selectedId?: string
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
      @click="emit('select', zone.id)"
    >
      <span
        class="vmr-zone-chip-swatch"
        :style="{ backgroundColor: zone.color }"
        aria-hidden="true"
      />
      <span class="vmr-zone-chip-name">{{ zone.name }}</span>
      <button
        type="button"
        class="vmr-zone-chip-remove"
        :aria-label="`${removeLabel}: ${zone.name}`"
        :style="zone.color ? { color: zone.color } : undefined"
        :disabled="disabled"
        @click.stop="emit('remove', zone.id)"
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
  cursor: pointer;
}
.vmr-zone-chip--selected {
  box-shadow: 0 0 0 2px var(--vmr-primary-color, #3b82f6);
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
.vmr-zone-chip-remove:hover {
  opacity: 1;
}
.vmr-zone-chip-remove:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
