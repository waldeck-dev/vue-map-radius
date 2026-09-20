/** Intl formatters are expensive to build and we format on every drag frame. */
const radiusFormatters = new Map<string, Intl.NumberFormat>()

/**
 * A radius as text — "20 km", "20 км", "20公里" — letting Intl place and
 * translate the unit instead of hardcoding a " km" suffix in every locale.
 */
export function formatRadius(km: number, locale = 'en'): string {
  let formatter = radiusFormatters.get(locale)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilometer', maximumFractionDigits: 2 })
    } catch {
      // Older engines reject style: 'unit'; a plain number reads fine with the
      // suffix appended.
      formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
      const plain = formatter
      formatter = { format: (v: number) => `${plain.format(v)} km` } as Intl.NumberFormat
    }
    radiusFormatters.set(locale, formatter)
  }
  return formatter.format(km)
}

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
