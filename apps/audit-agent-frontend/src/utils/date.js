// Local date helpers for consistent YYYY-MM-DD handling without UTC shifts

export function toLocalDateKey(input) {
  const d = normalizeToDate(input)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDateKey(key) {
  if (key instanceof Date) return new Date(key.getFullYear(), key.getMonth(), key.getDate())
  if (typeof key === 'number') {
    const d = new Date(key)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  if (typeof key === 'string') {
    // Accept YYYY-MM-DD (local) or any string Date can parse, but prefer YMD
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(key)
    if (m) {
      const [y, mo, da] = key.split('-').map(Number)
      return new Date(y, mo - 1, da)
    }
    const d = new Date(key)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  // Fallback: today
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function normalizeToDate(input) {
  if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  if (typeof input === 'string') return parseLocalDateKey(input)
  if (typeof input === 'number') return parseLocalDateKey(input)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

