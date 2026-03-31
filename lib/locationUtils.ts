/**
 * Normalizes a location string before storage or comparison.
 * - Trims leading/trailing whitespace
 * - Removes trailing punctuation (.,;:!?)
 * - Collapses internal whitespace
 * - Title-cases every word ("soggiorno" → "Soggiorno")
 */
export function normalizeLocation(raw: string): string {
  if (!raw) return ''
  const cleaned = raw
    .trim()
    .replace(/[\s,.:;!?]+$/, '')
    .replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
