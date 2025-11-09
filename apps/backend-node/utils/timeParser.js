import * as chrono from "chrono-node"

// Extract the first recognizable datetime from free text.
// Returns an ISO 8601 string or null if nothing found.
export function extractTime(text, refDate) {
  try {
    const reference =
      refDate && !Number.isNaN(new Date(refDate).getTime())
        ? new Date(refDate)
        : undefined
    const results = chrono.parse(String(text || ""), reference)
    if (results && results.length > 0) {
      const d = results[0].date()
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d.toISOString()
      }
    }
  } catch {}
  return null
}
