import { ref, computed } from 'vue'

export type ValidationMessage =
  | { key: 'radius.minMessage'; params: { min: number } }
  | { key: 'radius.maxMessage'; params: { max: number } }
  | null

export function useRadius(minRadius: number, maxRadius: number) {
  const radiusKm = ref<number>(10)
  const center = ref<[number, number] | null>(null)

  const clampedRadius = computed(() => {
    return Math.max(minRadius, Math.min(maxRadius, radiusKm.value))
  })

  const validationMessage = computed<ValidationMessage>(() => {
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

  return { radiusKm, clampedRadius, validationMessage, setRadius, setCenter, center, clamp }
}
