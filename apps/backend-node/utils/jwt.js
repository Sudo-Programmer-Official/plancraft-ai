import crypto from 'crypto'

function base64urlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function base64urlDecode(str) {
  if (!str) return ''
  let value = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = value.length % 4
  if (pad) value += '='.repeat(4 - pad)
  return Buffer.from(value, 'base64').toString('utf8')
}

export function signHS256(payloadObj = {}, secret, ttlSec) {
  if (!secret) throw new Error('signHS256 requires a secret')
  const header = { alg: 'HS256', typ: 'JWT' }
  const nowSec = Math.floor(Date.now() / 1000)
  const payload = { iat: nowSec, ...payloadObj }
  if (ttlSec && Number.isFinite(ttlSec)) {
    payload.exp = nowSec + Math.max(ttlSec, 1)
  }
  const encHeader = base64urlEncode(JSON.stringify(header))
  const encPayload = base64urlEncode(JSON.stringify(payload))
  const data = `${encHeader}.${encPayload}`
  const sig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest()
  const encSig = base64urlEncode(sig)
  return `${data}.${encSig}`
}

export function verifyHS256(token, secret) {
  try {
    if (!token || !secret) return null
    const [h, p, s] = String(token || '').split('.')
    if (!h || !p || !s) return null
    const data = `${h}.${p}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    if (expected !== s) return null
    const payload = JSON.parse(base64urlDecode(p))
    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null
    return payload
  } catch {
    return null
  }
}
