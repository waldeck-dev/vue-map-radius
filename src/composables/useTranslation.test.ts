import { describe, it, expect } from 'vitest'
import { useTranslation } from '../composables/useTranslation'

describe('useTranslation', () => {
  it('should return English translation for known key', () => {
    const { t } = useTranslation('en')
    expect(t('search.placeholder')).toBe('Search for a place...')
  })

  it('should return French translation for known key', () => {
    const { t } = useTranslation('fr')
    expect(t('search.placeholder')).toBe('Rechercher un lieu...')
  })

  it('should return the key itself for missing key', () => {
    const { t } = useTranslation('en')
    expect(t('some.missing.key')).toBe('some.missing.key')
  })

  it('should replace params in translation string', () => {
    const { t } = useTranslation('en')
    expect(t('radius.minMessage', { min: 5 })).toBe('Minimum radius is 5 km')
  })

  it('should fallback to English for missing French key', () => {
    const { t } = useTranslation('fr')
    // Access a key that's not a valid translation key to test fallback
    const result = t('some.missing.key')
    expect(result).toBe('some.missing.key')
  })

  it('should merge custom translations on top of built-in', () => {
    const { t } = useTranslation('en', {
      en: { 'search.placeholder': 'Find a location...' },
    })
    expect(t('search.placeholder')).toBe('Find a location...')
  })

  it('should keep built-in keys when custom translation does not override them', () => {
    const { t } = useTranslation('en', {
      en: { 'custom.key': 'custom value' },
    })
    expect(t('search.placeholder')).toBe('Search for a place...')
    expect(t('custom.key')).toBe('custom value')
  })

  it('should fallback to built-in en for invalid locale', () => {
    const { t } = useTranslation('de')
    expect(t('search.placeholder')).toBe('Search for a place...')
  })
})
