<script setup lang="ts">
defineProps<{
  label: string
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()
</script>

<template>
  <button
    class="vmr-confirm-btn"
    :class="{ 'vmr-confirm-btn--loading': loading }"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : 'false'"
    @click="emit('confirm')"
  >
    <span v-if="loading" class="vmr-confirm-spinner" aria-hidden="true" />
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.vmr-confirm-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.vmr-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vmr-confirm-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: vmr-spin 0.6s linear infinite;
}
@keyframes vmr-spin {
  to { transform: rotate(360deg); }
}
</style>
