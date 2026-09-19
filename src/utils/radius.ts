export type ValidationMessage =
  | { key: 'radius.minMessage'; params: { min: number } }
  | { key: 'radius.maxMessage'; params: { max: number } }
  | null

export function clampRadius(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getValidationMessage(value: number, min: number, max: number): ValidationMessage {
  if (value < min) {
    return { key: 'radius.minMessage', params: { min } }
  }
  if (value > max) {
    return { key: 'radius.maxMessage', params: { max } }
  }
  return null
}
