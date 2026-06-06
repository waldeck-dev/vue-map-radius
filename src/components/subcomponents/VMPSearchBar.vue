<script setup lang="ts">
import type { GeocodingResult } from '../../types'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder: string
  results: GeocodingResult[]
  loading: boolean
  noResultsText?: string
  loadingText?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'select', val: GeocodingResult): void
}>()

const showDropdown = ref(false)
const activeIndex = ref(-1)

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
  showDropdown.value = val.length > 0
  activeIndex.value = -1
}

function onSelect(result: GeocodingResult) {
  emit('select', result)
  showDropdown.value = false
  activeIndex.value = -1
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false; activeIndex.value = -1 }, 200)
}

function onFocus() {
  if (props.modelValue.length > 0) {
    showDropdown.value = true
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, props.results.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
  } else if (e.key === 'Enter' && activeIndex.value >= 0 && activeIndex.value < props.results.length) {
    e.preventDefault()
    onSelect(props.results[activeIndex.value])
  } else if (e.key === 'Escape') {
    showDropdown.value = false
    activeIndex.value = -1
  }
}

watch(() => props.modelValue, () => {
  if (props.modelValue.length === 0) {
    showDropdown.value = false
    activeIndex.value = -1
  }
})
</script>

<template>
  <div class="vmr-search-bar" role="combobox" :aria-expanded="showDropdown" aria-haspopup="listbox">
    <input
      :value="modelValue"
      :placeholder="placeholder"
      class="vmr-search-input"
      aria-label="Search for a place"
      aria-autocomplete="list"
      aria-controls="vmr-search-results"
      role="searchbox"
      type="text"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />
    <div
      v-if="showDropdown"
      id="vmr-search-results"
      class="vmr-search-dropdown"
      role="listbox"
    >
      <div
        v-if="loading"
        class="vmr-search-dropdown-item vmr-search-loading"
        role="status"
      >
        {{ loadingText || 'Loading...' }}
      </div>
      <div
        v-else-if="results.length === 0"
        class="vmr-search-dropdown-item vmr-search-no-results"
        role="status"
      >
        {{ noResultsText || 'No results found' }}
      </div>
      <div
        v-for="(result, idx) in results"
        :key="result.id"
        class="vmr-search-dropdown-item"
        :class="{ 'vmr-search-dropdown-item--active': idx === activeIndex }"
        role="option"
        :aria-label="result.placeName"
        :aria-selected="idx === activeIndex"
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
.vmr-search-dropdown-item:hover,
.vmr-search-dropdown-item--active {
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
