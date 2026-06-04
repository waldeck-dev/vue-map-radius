<script setup lang="ts">
defineProps<{
  label: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()
</script>

<template>
  <button
    class="vmr-confirm-btn"
    @click="emit('confirm')"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.vmr-confirm-btn {
  width: 100%;
  padding: 8px 16px;
  border: 1px solid var(--vmr-primary-color, #3b82f6);
  border-radius: var(--vmr-search-radius, 6px);
  background: var(--vmr-primary-color, #3b82f6);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.vmr-confirm-btn:hover {
  opacity: 0.9;
}
</style>
