// Frontend timezone helper
// Uses dayjs.tz.guess if available, otherwise Intl

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc)
dayjs.extend(timezone)

// // Debug helper to log request/response with masked sensitive info
// function dbgFetch(req, resp) {
//   if (!DEBUG) return null
//   const dbgBody = {
//     url: req.url,
//     method: req.method,
//     headers: {},
//   }
//   for (const [k, v] of req.headers.entries()) {
//     if (['authorization', 'token', 'access-token', 'x-api-key'].includes(k.toLowerCase())) {
//       dbgBody.headers[k] = mask(v)
//     } else {
//       dbgBody.headers[k] = v
//     }
//   }
//   if (req.body) {
//     try {
//       const obj = JSON.parse(req.body)
//       if (obj.password) obj.password = mask(obj.password)
//       if (obj.token) obj.token = mask(obj.token)
//       if (obj.access_token) obj.access_token = mask(obj.access_token)
//       if (obj.api_key) obj.api_key = mask(obj.api_key)
//       dbgBody.body = obj
//     } catch {
//       dbgBody.body = String(req.body).slice(0, 100)
//     }
//   }
//   console.log('[fetch] request', dbgBody)
//   if (resp) {
//     console.log('[fetch] response', { status: resp.status, body: resp.ok ? '(ok)' : '(error)' })
//   }
//   return true
// }

// Get user's timezone, defaulting to 'America/Chicago' if not available
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/Chicago'
  }
}

export function formatLocalTime(date, tz) {
  try {
    if (typeof dayjs !== 'undefined' && dayjs.tz) {
      return dayjs(date).tz(tz || getUserTimezone()).format('hh:mm A')
    }
  } catch (_) {}
  try {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_) {
    return String(date)
  }
}
