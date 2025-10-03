// // utils/dateHelper.js

// // Normalize Date → "YYYY-MM-DD" in local timezone
// export function toLocalDateKey(date = new Date()) {
//   const y = date.getFullYear()
//   const m = String(date.getMonth() + 1).padStart(2, '0')
//   const d = String(date.getDate()).padStart(2, '0')
//   return `${y}-${m}-${d}`
// }

// // Parse "YYYY-MM-DD" → Date (local midnight)
// export function parseLocalDateKey(str) {
//   if (!str) return new Date()
//   const [y, m, d] = str.split('-').map(Number)
//   return new Date(y, m - 1, d)
// }

// // Optional: If later you want UTC conversions
// export function toUTCDateKey(date = new Date()) {
//   return date.toISOString().split('T')[0]
// }

// Normalize Date → "YYYY-MM-DD" (local timezone)
export function toLocalDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse "YYYY-MM-DD" → Date (local midnight)
export function parseLocalDateKey(str) {
  if (!str) return new Date()
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Convert Local → UTC Date
export function localToUTC(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
}

// Convert UTC → Local Date
export function utcToLocal(date) {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000)
}

// Format with time (nice for display in UI/WhatsApp/etc.)
export function formatDateTime(date) {
  return date.toLocaleString(undefined, { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit' 
  })
}

// Parse ISO string safely
export function parseISO(str) {
  return new Date(str)
}