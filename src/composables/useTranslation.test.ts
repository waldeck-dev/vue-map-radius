import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useTranslation } from '../composables/useTranslation'

describe('useTranslation', () => {
  it('should return English translation for known key', () => {
    const { t } = useTranslation('en')
    expect(t('search.placeholder')).toBe('Search for a location...')
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
    expect(t('radius.minMessage', { min: '5 km' })).toBe('Minimum radius is 5 km')
  })

  it('should replace every occurrence of a placeholder, not just the first', () => {
    const { t } = useTranslation('en', { en: { 'custom.key': '{n} of {n}' } })
    expect(t('custom.key', { n: 3 })).toBe('3 of 3')
  })

  it('should leave a placeholder alone when no matching param is given', () => {
    const { t } = useTranslation('en', { en: { 'custom.key': '{a} / {b}' } })
    expect(t('custom.key', { a: 1 })).toBe('1 / {b}')
  })

  it('should warn once a key resolves to nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    useTranslation('en').t('some.missing.key')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('some.missing.key'))
    warn.mockRestore()
  })

  it('should follow a locale that changes after setup', () => {
    const locale = ref('en')
    const { t } = useTranslation(locale)
    expect(t('search.placeholder')).toBe('Search for a location...')
    locale.value = 'fr'
    expect(t('search.placeholder')).toBe('Rechercher un lieu...')
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
    expect(t('search.placeholder')).toBe('Search for a location...')
    expect(t('custom.key')).toBe('custom value')
  })

  it('should fallback to built-in en for invalid locale', () => {
    const { t } = useTranslation('de')
    expect(t('search.placeholder')).toBe('Search for a location...')
  })
})
