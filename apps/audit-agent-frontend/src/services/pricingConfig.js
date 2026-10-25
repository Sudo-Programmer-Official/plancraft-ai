// Matches the existing $5.00 recurring Premium price in Stripe.
export const STANDARD_MONTHLY_PRICE = 5
export const FOUNDING_MONTHLY_PRICE = 2
export const INTELLIGENCE_MONTHLY_RUNS = 30

function enabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

const configuredFoundingEndAt = Date.parse(String(import.meta.env.VITE_FOUNDING_OFFER_END_AT || '').trim())

export const FOUNDING_OFFER_END_AT = Number.isFinite(configuredFoundingEndAt) ? configuredFoundingEndAt : 0
export const FOUNDING_OFFER_CONFIGURED =
  enabled(import.meta.env.VITE_FOUNDING_OFFER_ENABLED) && FOUNDING_OFFER_END_AT > Date.now()

export function isFoundingOfferActive(now = Date.now()) {
  return FOUNDING_OFFER_CONFIGURED && FOUNDING_OFFER_END_AT > now
}

export function formatUsd(amount) {
  return `$${Number(amount).toFixed(2).replace(/\.00$/, '')}`
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
