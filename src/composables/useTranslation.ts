import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import en, { type TranslationKey } from '../locales/en'
import fr from '../locales/fr'

export type { TranslationKey }

/** Any built-in key, plus whatever a consumer adds through `translations`. */
export type TranslateKey = TranslationKey | (string & {})

const builtIn: Record<string, Record<string, string>> = { en, fr }

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Locale and overrides are read through `toValue`, so a language switcher in
 * the host app re-renders every label instead of freezing the one setup saw.
 */
export function useTranslation(
  locale: MaybeRefOrGetter<string>,
  customTranslations: MaybeRefOrGetter<Record<string, Record<string, string>>> = {},
) {
  const dictionaries = computed(() => {
    const custom = toValue(customTranslations)
    const active = toValue(locale)
    return {
      merged: { ...(builtIn[active] ?? en), ...(custom[active] ?? {}) },
      fallback: { ...en, ...(custom.en ?? {}) } as Record<string, string>,
    }
  })

  function t(key: TranslateKey, params?: Record<string, string | number>): string {
    const { merged, fallback } = dictionaries.value
    const template = merged[key] ?? fallback[key]
    if (template === undefined) {
      if (import.meta.env?.DEV) {
        console.warn(`[vue-map-radius] missing translation for "${key}"`)
      }
      return key
    }
    // Replace every occurrence, and leave an unmatched placeholder in place so
    // the gap is visible rather than silently blank.
    return params
      ? template.replace(PLACEHOLDER, (whole, name: string) => (name in params ? String(params[name]) : whole))
      : template
  }

  return { t }
}
