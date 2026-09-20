import type { TranslationKey } from './en'

const locales: Record<TranslationKey, string> = {
  'search.placeholder': 'Rechercher un lieu...',
  'search.ariaLabel': 'Rechercher un lieu',
  'search.loading': 'Recherche...',
  'search.resultCount': '{count} résultats disponibles',
  'info.noResults': 'Aucun résultat trouvé',
  'info.nonPolygon': 'Le lieu sélectionné n\'est pas une zone polygonale',
  'radius.label': 'Rayon (km)',
  'radius.minMessage': 'Le rayon minimum est de {min}',
  'radius.maxMessage': 'Le rayon maximum est de {max}',
  'mode.radius': 'Rayon',
  'mode.polygon': 'Polygone',
  'mode.ariaLabel': 'Mode de sélection',
  'map.ariaLabel': 'Carte',
  'error.noApiKey': 'La clé API MapTiler est requise',
  'error.network': 'Erreur réseau, veuillez réessayer',
  'zone.remove': 'Supprimer',
  'zone.loading': 'Ajout de la zone…',
}

export default locales
