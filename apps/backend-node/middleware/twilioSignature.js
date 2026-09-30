import twilio from 'twilio'

function configuredBase() {
  return String(process.env.API_BASE_URL || process.env.PUBLIC_API_BASE || '').trim().replace(/\/$/, '')
}

function requestBase(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  const proto = (protoHeader || req.protocol || 'https').split(',')[0].trim() || 'https'
  const host = req.get('host')
  return host ? `${proto}://${host}` : ''
}

// Verifies X-Twilio-Signature on inbound Twilio webhooks. Twilio signs the full
// public URL it called, so try the configured API base (used when we build
// statusCallback URLs) and the URL as seen through the proxy. Fails closed when
// the auth token is not configured.
export function requireTwilioSignature(req, res, next) {
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '')
  const signature = String(req.headers['x-twilio-signature'] || '')
  if (!authToken || !signature) {
    return res.status(403).send('Forbidden')
  }

  const params = req.method === 'POST' ? req.body || {} : {}
  const bases = [...new Set([configuredBase(), requestBase(req)].filter(Boolean))]
  const valid = bases.some((base) =>
    twilio.validateRequest(authToken, signature, `${base}${req.originalUrl}`, params),
  )
  if (!valid) {
    console.warn('[Twilio] rejected webhook with invalid signature', { path: req.path })
    return res.status(403).send('Forbidden')
  }
  return next()
}
