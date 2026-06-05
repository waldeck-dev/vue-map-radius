<script setup lang="ts">
import type { GeocodingResult } from '../../types'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  results: GeocodingResult[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'select', val: GeocodingResult): void
}>()

const inputRef = ref<HTMLInputElement>()
const showDropdown = ref(false)

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
  showDropdown.value = val.length > 0
}

function onSelect(result: GeocodingResult) {
  emit('select', result)
  showDropdown.value = false
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

function onFocus() {
  if (props.modelValue.length > 0) {
    showDropdown.value = true
  }
}

watch(() => props.modelValue, () => {
  if (props.modelValue.length === 0) {
    showDropdown.value = false
  }
})
</script>

<template>
  <div class="vmr-search-bar">
    <input
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      class="vmr-search-input"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      type="text"
    />
    <div v-if="showDropdown" class="vmr-search-dropdown">
      <div v-if="loading" class="vmr-search-dropdown-item vmr-search-loading">
        Loading...
      </div>
      <div
        v-else-if="results.length === 0"
        class="vmr-search-dropdown-item vmr-search-no-results"
      >
        No results found
      </div>
      <div
        v-for="result in results"
        :key="result.id"
        class="vmr-search-dropdown-item"
        @mousedown.prevent="onSelect(result)"
      >
        <span class="vmr-search-result-text">{{ result.text }}</span>
        <span class="vmr-search-result-place">{{ result.placeName }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vmr-search-bar {
  position: relative;
  width: 100%;
}
.vmr-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vmr-search-border, #d1d5db);
  border-radius: var(--vmr-search-radius, 6px);
  background: var(--vmr-search-bg, #ffffff);
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}
.vmr-search-input:focus {
  border-color: var(--vmr-primary-color, #3b82f6);
}
.vmr-search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: 4px;
  border: 1px solid var(--vmr-search-border, #d1d5db);
  border-radius: var(--vmr-search-radius, 6px);
  background: var(--vmr-search-bg, #ffffff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 240px;
  overflow-y: auto;
}
.vmr-search-dropdown-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vmr-search-dropdown-item:hover {
  background: rgba(59, 130, 246, 0.08);
}
.vmr-search-result-text {
  font-weight: 600;
  font-size: 14px;
}
.vmr-search-result-place {
  font-size: 12px;
  color: #6b7280;
}
.vmr-search-loading,
.vmr-search-no-results {
  cursor: default;
  color: #6b7280;
  font-size: 13px;
}
</style>
