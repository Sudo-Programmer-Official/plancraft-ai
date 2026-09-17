import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAuthIdentityDocumentId,
  getVerifiedAuthIdentities,
  maskIdentityValue,
  normalizeAuthProvider,
} from '../utils/authIdentity.js'

test('normalizes supported Firebase provider aliases', () => {
  assert.equal(normalizeAuthProvider('google'), 'google.com')
  assert.equal(normalizeAuthProvider('email'), 'password')
  assert.equal(normalizeAuthProvider('phone'), 'phone')
  assert.equal(normalizeAuthProvider('apple'), 'apple.com')
})

test('uses only provider-verified claims for identity resolution', () => {
  const claims = {
    uid: 'firebase-phone-uid',
    phone_number: '+16145550123',
    phone: '+19999999999',
    firebase: {
      sign_in_provider: 'phone',
      identities: {
        phone: ['+16145550123'],
      },
    },
  }

  assert.deepEqual(getVerifiedAuthIdentities(claims, 'phone'), [
    { provider: 'phone', providerUid: '+16145550123', verified: true },
  ])
  assert.equal(getVerifiedAuthIdentities({ phone: '+19999999999' }, 'phone').length, 0)
})

test('builds stable, provider-scoped identity document ids', () => {
  const first = buildAuthIdentityDocumentId('google.com', 'google-user-123')
  const second = buildAuthIdentityDocumentId('google.com', 'google-user-123')
  const otherProvider = buildAuthIdentityDocumentId('phone', '+16145550123')

  assert.equal(first, second)
  assert.notEqual(first, otherProvider)
  assert.match(first, /^google\.com__/)
})

test('masks identity values before conflict responses', () => {
  assert.equal(maskIdentityValue('person@example.com'), 'pe***@example.com')
  assert.equal(maskIdentityValue('+16145550123'), '+1…23')
})
