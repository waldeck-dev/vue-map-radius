const locales = {
  'search.placeholder': 'Search for a location...',
  'search.ariaLabel': 'Search for a location',
  'search.loading': 'Searching...',
  'search.resultCount': '{count} results available',
  'info.noResults': 'No results found',
  'info.nonPolygon': 'Selected location is not a polygon area',
  'radius.label': 'Radius (km)',
  'radius.minMessage': 'Minimum radius is {min}',
  'radius.maxMessage': 'Maximum radius is {max}',
  'mode.radius': 'Radius',
  'mode.polygon': 'Polygon',
  'mode.ariaLabel': 'Selection mode',
  'map.ariaLabel': 'Map',
  'error.noApiKey': 'MapTiler API key is required',
  'error.network': 'Network error, please try again',
  'zone.remove': 'Remove',
  'zone.loading': 'Adding zone…',
} satisfies Record<string, string>

/** Every key the built-in UI renders; custom translations may add their own. */
export type TranslationKey = keyof typeof locales

export default locales
