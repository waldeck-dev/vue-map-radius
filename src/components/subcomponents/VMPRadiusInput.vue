<script setup lang="ts">
withDefaults(defineProps<{
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
    <label class="vmr-radius-label" for="vmr-radius-field">{{ label }}</label>
    <input
      id="vmr-radius-field"
      type="number"
      min="0"
      :step="step"
      :value="modelValue"
      class="vmr-radius-field"
      aria-describedby="vmr-radius-msg"
      @input="onInput"
      @blur="onBlur"
    />
    <span id="vmr-radius-msg" v-if="minMessage" class="vmr-radius-message" role="alert">{{ minMessage }}</span>
    <span id="vmr-radius-msg" v-else-if="maxMessage" class="vmr-radius-message" role="alert">{{ maxMessage }}</span>
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
.vmr-radius-field:focus {
  border-color: var(--vmr-primary-color, #3b82f6);
}
.vmr-radius-message {
  font-size: 12px;
  color: #ef4444;
}
</style>
