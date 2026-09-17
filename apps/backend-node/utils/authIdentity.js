const PROVIDER_ALIASES = {
  google: 'google.com',
  'google.com': 'google.com',
  phone: 'phone',
  password: 'password',
  email: 'password',
  apple: 'apple.com',
  'apple.com': 'apple.com',
}

export function normalizeAuthProvider(provider, claims = {}) {
  const hinted = String(provider || '').trim().toLowerCase()
  if (PROVIDER_ALIASES[hinted]) return PROVIDER_ALIASES[hinted]

  const signInProvider = String(claims?.firebase?.sign_in_provider || '').trim().toLowerCase()
  return PROVIDER_ALIASES[signInProvider] || signInProvider || 'password'
}

function getIdentityValues(claims, provider) {
  const identities = claims?.firebase?.identities
  if (!identities || typeof identities !== 'object') return []
  const values = identities[provider]
  return Array.isArray(values) ? values.filter(Boolean).map(String) : []
}

/**
 * Returns identities whose ownership was established by Firebase Auth.
 * User-entered profile/contact fields intentionally do not participate.
 */
export function getVerifiedAuthIdentities(claims = {}, providerHint = '') {
  const provider = normalizeAuthProvider(providerHint, claims)
  const values = getIdentityValues(claims, provider)

  if (provider === 'phone') {
    const phoneNumber = String(claims?.phone_number || '').trim()
    return phoneNumber ? [{ provider, providerUid: phoneNumber, verified: true }] : []
  }

  if (provider === 'password') {
    const email = String(values[0] || claims?.email || '').trim().toLowerCase()
    return email ? [{ provider, providerUid: email, verified: true }] : []
  }

  return values.slice(0, 5).map((providerUid) => ({ provider, providerUid, verified: true }))
}

export function buildAuthIdentityDocumentId(provider, providerUid) {
  const safeProvider = String(provider || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_')
  const encodedUid = Buffer.from(String(providerUid || ''), 'utf8').toString('base64url')
  return `${safeProvider}__${encodedUid}`.slice(0, 1_500)
}

export function maskIdentityValue(value) {
  const raw = String(value || '')
  if (!raw) return null
  if (raw.includes('@')) {
    const [local, domain] = raw.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
  return raw.length <= 4 ? '***' : `${raw.slice(0, 2)}…${raw.slice(-2)}`
}
