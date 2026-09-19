<script setup lang="ts">
defineProps<{
  zones: { id: string; name: string }[]
  removeLabel: string
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
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
      role="listitem"
    >
      <span class="vmr-zone-chip-name">{{ zone.name }}</span>
      <button
        type="button"
        class="vmr-zone-chip-remove"
        :aria-label="`${removeLabel}: ${zone.name}`"
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
}
.vmr-zone-chip-remove:hover {
  color: var(--vmr-primary-color, #3b82f6);
}
</style>
