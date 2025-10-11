// import * as chrono from "chrono-node"

// // Extract the first recognizable datetime from free text.
// // Returns an ISO 8601 string or null if nothing found.
// export function extractTime(text) {
//   try {
//     const results = chrono.parse(String(text || ""))
//     if (results && results.length > 0) {
//       const d = results[0].date()
//       if (d instanceof Date && !isNaN(d.getTime())) {
//         return d.toISOString()
//       }
//     }
//   } catch {}
//   return null
// }

import * as chrono from 'chrono-node'

export function extractTime(text) {
  try {
    const results = chrono.parse(String(text || ''))
    if (results && results.length > 0) {
      const d = results[0].date()
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString()
    }
  } catch (e) {
    console.warn('[extractTime] chrono parse failed:', e.message)
  }
  return null
}