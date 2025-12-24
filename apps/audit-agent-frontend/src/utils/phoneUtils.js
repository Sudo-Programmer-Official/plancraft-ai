import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizePhone(input, userCountry = 'US') {
  try {
    const raw = String(input || '').trim()
    if (!raw) return ''
    const number = parsePhoneNumberFromString(raw, userCountry || 'US')
    if (number && number.isValid()) return number.number
    // fallback: digits only, ensure leading +
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const upper = String(userCountry || 'US').toUpperCase()
    if (upper === 'US' || upper === 'CA') {
      if (digits.length === 10) return `+1${digits}`
      if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
    }
    return digits.startsWith('+') ? digits : `+${digits}`
  } catch {
    const raw = String(input || '')
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return digits.startsWith('+') ? digits : `+${digits}`
  }
}

export function guessCountryFromLocale() {
  try {
    const lang = (navigator?.language || 'en-US').toUpperCase()
    const parts = lang.split('-')
    return parts.length > 1 ? parts[1] : 'US'
  } catch { return 'US' }
}
