import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizePhone(input, country = 'US') {
  try {
    const raw = String(input || '').trim()
    if (!raw) return ''
    const num = parsePhoneNumberFromString(raw, country || 'US')
    if (num && num.isValid()) return num.number
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return digits.startsWith('+') ? digits : `+${digits}`
  } catch {
    const raw = String(input || '')
    const digits = raw.replace(/\D/g, '')
    return digits ? (digits.startsWith('+') ? digits : `+${digits}`) : ''
  }
}

export function guessCountry(req) {
  try {
    const hdr = (req?.headers?.['x-user-country'] || req?.headers?.['X-User-Country'] || '').toString().trim()
    if (hdr) return hdr.toUpperCase()
  } catch {}
  // Fallback: derive from tz like America/Chicago -> US (best-effort list)
  try {
    const tz = String(req?.headers?.['x-user-tz'] || '')
    if (/america\//i.test(tz)) return 'US'
    if (/europe\//i.test(tz)) return 'GB'
    if (/asia\/kolkata/i.test(tz)) return 'IN'
  } catch {}
  return 'US'
}

