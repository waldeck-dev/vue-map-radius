import { ref, computed } from 'vue'

export function useRadius(minRadius: number, maxRadius: number) {
  const radiusKm = ref<number>(10)
  const center = ref<[number, number] | null>(null)

  const clampedRadius = computed(() => {
    return Math.max(minRadius, Math.min(maxRadius, radiusKm.value))
  })

  const isValid = computed(() => {
    return radiusKm.value >= minRadius && radiusKm.value <= maxRadius
  })

  const validationMessage = computed(() => {
    if (radiusKm.value < minRadius) {
      return { key: 'radius.minMessage', params: { min: minRadius } }
    }
    if (radiusKm.value > maxRadius) {
      return { key: 'radius.maxMessage', params: { max: maxRadius } }
    }
    return null
  })

  function setRadius(value: number) {
    radiusKm.value = value
  }

  function setCenter(value: [number, number]) {
    center.value = value
  }

  function clamp() {
    radiusKm.value = clampedRadius.value
  }

  return { radiusKm, clampedRadius, isValid, validationMessage, setRadius, setCenter, center, clamp }
}
