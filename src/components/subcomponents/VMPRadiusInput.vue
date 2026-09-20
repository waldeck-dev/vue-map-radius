<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  label: string
  step?: number
  minMessage?: string
  maxMessage?: string
}>(), {
  step: 1,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
  (e: 'blur'): void
}>()

// Per instance: a hardcoded id collides as soon as a page mounts two maps.
const uid = useId()
const fieldId = `${uid}-radius`
const messageId = `${uid}-radius-message`

const message = computed(() => props.minMessage || props.maxMessage || null)

function onInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    emit('update:modelValue', val)
  }
}

function onBlur() {
  emit('blur')
}
</script>

<template>
  <div class="vmr-radius-input">
    <label
      class="vmr-radius-label"
      :for="fieldId"
    >{{ label }}</label>
    <input
      :id="fieldId"
      type="number"
      min="0"
      :step="step"
      :value="modelValue"
      class="vmr-radius-field"
      :aria-describedby="message ? messageId : undefined"
      :aria-invalid="message ? 'true' : undefined"
      @input="onInput"
      @blur="onBlur"
    >
    <span
      v-if="message"
      :id="messageId"
      class="vmr-radius-message"
      role="alert"
    >{{ message }}</span>
  </div>
</template>

<style scoped>
.vmr-radius-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vmr-radius-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.vmr-radius-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vmr-search-border, #d1d5db);
  border-radius: var(--vmr-search-radius, 6px);
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}
.vmr-radius-field:focus-visible {
  border-color: var(--vmr-primary-color, #2563eb);
  outline: 2px solid var(--vmr-primary-color, #2563eb);
  outline-offset: 1px;
}
.vmr-radius-message {
  font-size: 12px;
  color: var(--vmr-error-color, #dc2626);
}
</style>
