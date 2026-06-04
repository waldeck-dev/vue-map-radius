import en from '../locales/en'
import fr from '../locales/fr'

const builtIn: Record<string, Record<string, string>> = { en, fr }

export function useTranslation(
  locale: string,
  customTranslations: Record<string, Record<string, string>> = {},
) {
  function t(key: string, params?: Record<string, string | number>): string {
    const merged: Record<string, string> = {
      ...(builtIn[locale] || builtIn['en']),
      ...(customTranslations[locale] || {}),
    }

    let value = merged[key]
    if (!value) {
      if (locale !== 'en') {
        const fallback: Record<string, string> = {
          ...(builtIn['en'] || {}),
          ...(customTranslations['en'] || {}),
        }
        value = fallback[key]
      }
      if (!value) {
        return key
      }
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
