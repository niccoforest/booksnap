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

/**
 * Calls /api/locations/normalize (which uses LLM) to deduplicate and correct
 * the raw input against the user's existing locations.
 * Falls back to normalizeLocation() on any error.
 */
export async function normalizeLocationLLM(
  rawLocation: string,
  existingLocations: string[]
): Promise<string> {
  const trimmed = rawLocation.trim()
  if (!trimmed) return ''
  try {
    const res = await fetch('/api/locations/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawLocation: trimmed, existingLocations }),
    })
    if (!res.ok) return normalizeLocation(trimmed)
    const data = await res.json()
    return data.normalized || normalizeLocation(trimmed)
  } catch {
    return normalizeLocation(trimmed)
  }
}
