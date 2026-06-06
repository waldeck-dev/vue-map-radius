import en from '../locales/en'
import fr from '../locales/fr'

const builtIn: Record<string, Record<string, string>> = { en, fr }

export function useTranslation(
  locale: string,
  customTranslations: Record<string, Record<string, string>> = {},
) {
  const merged: Record<string, string> = {
    ...(builtIn[locale] || builtIn['en']),
    ...(customTranslations[locale] || {}),
  }
  const fallback: Record<string, string> = locale === 'en' ? merged : {
    ...(builtIn['en'] || {}),
    ...(customTranslations['en'] || {}),
  }

  function t(key: string, params?: Record<string, string | number>): string {
    let value = merged[key]
    if (!value) {
      value = fallback[key]
    }
    if (!value) {
      return key
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }

  return { t }
}
