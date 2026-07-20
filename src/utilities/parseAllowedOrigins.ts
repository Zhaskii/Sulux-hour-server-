/** Parses CORS/CSRF origins from comma-separated or JSON array env values. */
export function parseAllowedOrigins(raw?: string): string[] {
  if (!raw) return []

  const trimmed = raw.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((origin): origin is string => typeof origin === 'string')
          .map((origin) => origin.trim())
          .filter(Boolean)
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  return trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
