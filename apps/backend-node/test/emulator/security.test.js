// API authorization tests against the Firebase emulators (Firestore + Auth).
// Run via `npm run test:security`; refuses to run without emulator hosts so it
// can never touch a real project.
import test, { after, before, beforeEach, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import express from 'express'

const PROJECT_ID = 'demo-plancraft-api'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Firebase emulators are not running; use `npm run test:security`')
}

// Throwaway credentials for the demo project, set before firebaseAdmin.js loads
// so the real service-account file is never used.
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: PROJECT_ID,
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  client_email: `test@${PROJECT_ID}.iam.gserviceaccount.com`,
})
// Never reach real Stripe: with no key the checkout route returns a static URL.
// Set before imports so a later dotenv load cannot override them.
process.env.STRIPE_SECRET_KEY = ''
process.env.STRIPE_MONTHLY_PRICE_ID = 'price_test'
process.env.STRIPE_CHECKOUT_URL = 'https://example.com/checkout'
process.env.SEO_PING_TOKEN = ''
// Twilio: no account SID means twilioService can never send a real SMS/call.
process.env.TWILIO_ACCOUNT_SID = ''
process.env.TWILIO_PHONE_NUMBER = ''
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-auth-token'
process.env.API_BASE_URL = 'https://api.example.test'

const { default: admin } = await import('firebase-admin')
const { db } = await import('../../services/firebaseAdmin.js')
const { attachAuth } = await import('../../middleware/auth.js')
const { default: carryoverRoutes } = await import('../../routes/carryoverRoutes.js')
const { default: workspaceRoutes } = await import('../../routes/workspaceRoutes.js')
const { default: stripeRoutes } = await import('../../routes/stripeRoutes.js')
const { default: pushRoutes } = await import('../../routes/pushRoutes.js')
const { default: seoRoutes } = await import('../../routes/seoRoutes.js')
const { default: twilioRoutes } = await import('../../routes/twilioRoutes.js')
const { default: twilio } = await import('twilio')

let server
let baseUrl
const tokens = {}

async function signIn(uid) {
  const email = `${uid}@example.com`
  const password = 'test-password-123'
  await admin.auth().createUser({ uid, email, password }).catch((err) => {
    if (err?.code !== 'auth/uid-already-exists') throw err
  })
  const res = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const body = await res.json()
  assert.ok(body.idToken, `emulator sign-in failed for ${uid}: ${JSON.stringify(body)}`)
  return body.idToken
}

async function call(method, path, { uid, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(uid ? { Authorization: `Bearer ${tokens[uid]}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, body: json }
}

async function clearFirestore() {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
}

before(async () => {
  // Mount each router on its own, without the rest of index.js, so every route
  // must enforce auth itself rather than relying on routers mounted earlier.
  const app = express()
  app.use(express.json())
  app.use('/api', attachAuth)
  app.use('/api', carryoverRoutes)
  app.use('/api', workspaceRoutes)
  app.use('/api', stripeRoutes)
  app.use('/api/push', pushRoutes)
  app.use('/', seoRoutes)
  app.use('/api/twilio', twilioRoutes)
  await new Promise((resolve) => { server = app.listen(0, resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`

  for (const uid of ['alice', 'bob', 'mallory', 'erin']) tokens[uid] = await signIn(uid)
})

after(async () => {
  await new Promise((resolve) => server?.close(resolve))
  await Promise.all(admin.apps.map((app) => app.delete()))
})

beforeEach(async () => {
  await clearFirestore()
  // Existing profiles keep requireAuth from treating callers as brand-new users.
  const batch = db.batch()
  for (const uid of ['alice', 'bob', 'mallory', 'erin']) {
    batch.set(db.collection('users').doc(uid), { name: uid, role: 'user', createdAt: new Date() })
  }
  batch.set(db.collection('tasks').doc('alice-carry'), { userId: 'alice', title: 'A', date: '2026-09-01', is_carryover: true })
  batch.set(db.collection('tasks').doc('bob-carry'), { userId: 'bob', title: 'B', date: '2026-09-01', is_carryover: true })
  await batch.commit()
})

const taskData = async (id) => (await db.collection('tasks').doc(id).get()).data()

describe('carryover mutations', () => {
  for (const path of ['/api/carryover/apply', '/api/carryover/ignore']) {
    test(`${path}: unauthenticated caller is rejected`, async () => {
      const res = await call('POST', path, { body: { userId: 'bob' }, headers: { 'x-user-id': 'bob' } })
      assert.equal(res.status, 401)
      assert.equal((await taskData('bob-carry')).is_carryover, true)
    })

    test(`${path}: caller cannot target another user via body.userId`, async () => {
      const res = await call('POST', path, { uid: 'alice', body: { userId: 'bob' } })
      assert.equal(res.status, 403)
      assert.equal((await taskData('bob-carry')).is_carryover, true)
    })

    test(`${path}: x-user-id header cannot redirect the mutation`, async () => {
      const res = await call('POST', path, { uid: 'alice', headers: { 'x-user-id': 'bob' } })
      assert.equal(res.status, 200)
      assert.equal((await taskData('bob-carry')).is_carryover, true)
      assert.equal((await taskData('alice-carry')).is_carryover, false)
    })
  }

  test('apply: legitimate call moves only the caller\'s carryover tasks', async () => {
    const res = await call('POST', '/api/carryover/apply', { uid: 'alice', body: {} })
    assert.equal(res.status, 200)
    assert.equal(res.body.moved, 1)
    const alice = await taskData('alice-carry')
    assert.equal(alice.is_carryover, false)
    assert.equal(alice.previousDate, '2026-09-01')
    assert.equal((await taskData('bob-carry')).is_carryover, true)
  })

  test('ignore: legitimate call archives only the caller\'s carryover tasks', async () => {
    const res = await call('POST', '/api/carryover/ignore', { uid: 'alice', body: { userId: 'alice' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.archived, 1)
    assert.equal((await taskData('alice-carry')).overdue, true)
    assert.equal((await taskData('bob-carry')).is_carryover, true)
  })
})

describe('legacy workspace migration (GET /api/workspaces)', () => {
  test('a planted legacy doc cannot take over another user\'s workspace', async () => {
    await db.collection('workspaces').doc('ws-bob').set({ name: 'Bob HQ', ownerId: 'bob' })
    await db.collection('workspace_members').doc('ws-bob_bob').set({
      workspaceId: 'ws-bob', userId: 'bob', role: 'owner', status: 'active',
    })
    // Simulates a doc written by a client before the rules were tightened.
    await db.collection('users').doc('mallory').collection('workspaces').doc('ws-bob').set({
      name: 'pwned', ownerId: 'mallory',
    })

    const res = await call('GET', '/api/workspaces', { uid: 'mallory' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.workspaces.map((w) => w.id), [])

    const ws = (await db.collection('workspaces').doc('ws-bob').get()).data()
    assert.equal(ws.ownerId, 'bob')
    assert.equal(ws.name, 'Bob HQ')
    assert.equal((await db.collection('workspace_members').doc('ws-bob_mallory').get()).exists, false)
  })

  test('genuine legacy workspaces are still migrated', async () => {
    await db.collection('users').doc('erin').collection('workspaces').doc('ws-erin').set({
      name: 'Erin legacy', ownerId: 'erin',
    })

    const res = await call('GET', '/api/workspaces', { uid: 'erin' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.workspaces.map((w) => w.id), ['ws-erin'])
    const member = (await db.collection('workspace_members').doc('ws-erin_erin').get()).data()
    assert.equal(member.status, 'active')
  })

  test('unauthenticated caller cannot list workspaces', async () => {
    const res = await call('GET', '/api/workspaces')
    assert.equal(res.status, 401)
  })
})

describe('checkout session', () => {
  test('unauthenticated caller is rejected', async () => {
    const res = await call('POST', '/api/create-checkout-session', { body: { userId: 'bob', plan: 'pro' } })
    assert.equal(res.status, 401)
  })

  test('caller cannot open a checkout for another user', async () => {
    const res = await call('POST', '/api/create-checkout-session', { uid: 'alice', body: { userId: 'bob', plan: 'pro' } })
    assert.equal(res.status, 403)
  })

  test('caller can open their own checkout (existing client payload)', async () => {
    const res = await call('POST', '/api/create-checkout-session', { uid: 'alice', body: { userId: 'alice', plan: 'pro' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.url, 'https://example.com/checkout')
  })
})

describe('web push registration', () => {
  const endpoint = 'https://push.example.com/sub/1'

  test('unauthenticated caller is rejected', async () => {
    const res = await call('POST', '/api/push/register', { body: { userId: 'bob', endpoint } })
    assert.equal(res.status, 401)
  })

  test('caller cannot register a subscription on another user', async () => {
    const res = await call('POST', '/api/push/register', { uid: 'alice', body: { userId: 'bob', endpoint } })
    assert.equal(res.status, 403)
    const bob = (await db.collection('users').doc('bob').get()).data()
    assert.equal(bob.integrations, undefined)
  })

  test('caller registers on their own profile (existing client payload)', async () => {
    const res = await call('POST', '/api/push/register', { uid: 'alice', body: { userId: 'alice', endpoint, keys: { p256dh: 'k', auth: 'a' } } })
    assert.equal(res.status, 200)
    const alice = (await db.collection('users').doc('alice').get()).data()
    assert.equal(alice.integrations.pwa.subscriptions[0].endpoint, endpoint)
  })
})

describe('SEO ping', () => {
  test('is disabled when SEO_PING_TOKEN is unset, even for signed-in users', async () => {
    const res = await call('POST', '/api/seo/ping', { uid: 'alice', body: { sitemapUrl: 'https://evil.example/s.xml' } })
    assert.equal(res.status, 403)
  })

  test('rejects a wrong token', async () => {
    process.env.SEO_PING_TOKEN = 'correct-token'
    try {
      const res = await call('POST', '/api/seo/ping', { headers: { 'x-seo-secret': 'wrong-token!!' } })
      assert.equal(res.status, 403)
    } finally {
      process.env.SEO_PING_TOKEN = ''
    }
  })
})

describe('Twilio webhooks', () => {
  const TOKEN = 'test-twilio-auth-token'

  async function postForm(path, params, { signWith, base = 'https://api.example.test', token = TOKEN } = {}) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
    if (signWith !== 'none') {
      const url = `${signWith || base}${path}`
      headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature(token, url, params)
    }
    const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: new URLSearchParams(params) })
    return { status: res.status, text: await res.text() }
  }

  async function seedSmsUser() {
    await db.collection('users').doc('bob').set(
      { integrations: { sms: { phone: '+16145550100' } }, preferences: { notifications: { sms: true } } },
      { merge: true },
    )
  }
  const bobSmsPref = async () => (await db.collection('users').doc('bob').get()).data().preferences.notifications.sms
  const count = async (col) => (await db.collection(col).get()).size

  test('incoming-sms without a signature is rejected and has no effect', async () => {
    await seedSmsUser()
    const res = await postForm('/api/twilio/incoming-sms', { From: '+16145550100', Body: 'STOP' }, { signWith: 'none' })
    assert.equal(res.status, 403)
    assert.equal(await bobSmsPref(), true)
    assert.equal(await count('sms_inbound'), 0)
  })

  test('incoming-sms signed with the wrong auth token is rejected', async () => {
    await seedSmsUser()
    const res = await postForm('/api/twilio/incoming-sms', { From: '+16145550100', Body: 'STOP' }, { token: 'attacker-guess' })
    assert.equal(res.status, 403)
    assert.equal(await bobSmsPref(), true)
  })

  test('a Firebase user token does not substitute for a Twilio signature', async () => {
    await seedSmsUser()
    const res = await fetch(`${baseUrl}/api/twilio/incoming-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${tokens.alice}` },
      body: new URLSearchParams({ From: '+16145550100', Body: 'STOP' }),
    })
    assert.equal(res.status, 403)
    assert.equal(await bobSmsPref(), true)
  })

  test('signed STOP opts the user out (URL built from API_BASE_URL)', async () => {
    await seedSmsUser()
    const res = await postForm('/api/twilio/incoming-sms', { From: '+16145550100', Body: 'STOP' })
    assert.equal(res.status, 200)
    assert.match(res.text, /opted out/)
    assert.equal(await bobSmsPref(), false)
  })

  test('signed request is accepted when Twilio called the request host directly', async () => {
    await seedSmsUser()
    const res = await postForm('/api/twilio/incoming-sms', { From: '+16145550100', Body: 'START' }, { signWith: baseUrl })
    assert.equal(res.status, 200)
    assert.equal(await bobSmsPref(), true)
  })

  test('fails closed when TWILIO_AUTH_TOKEN is not configured', async () => {
    process.env.TWILIO_AUTH_TOKEN = ''
    try {
      const res = await postForm('/api/twilio/incoming-sms', { From: '+1', Body: 'hi' }, { token: '' })
      assert.equal(res.status, 403)
    } finally {
      process.env.TWILIO_AUTH_TOKEN = TOKEN
    }
  })

  test('forged call-status cannot trigger a fallback SMS to another user', async () => {
    const res = await postForm('/api/twilio/call-status?u=bob&m=spam', { CallStatus: 'no-answer', CallSid: 'CA1' }, { signWith: 'none' })
    assert.equal(res.status, 403)
    assert.equal(await count('delivery_logs'), 0)
  })

  test('signed call-status is logged', async () => {
    const res = await postForm('/api/twilio/call-status?u=bob&m=hello', { CallStatus: 'completed', CallSid: 'CA2' })
    assert.equal(res.status, 204)
    assert.equal(await count('delivery_logs'), 1)
  })

  test('forged voice-response cannot drive TTS', async () => {
    const res = await postForm('/api/twilio/voice-response', { message: 'burn tts credits' }, { signWith: 'none' })
    assert.equal(res.status, 403)
  })

  test('send-sms still requires a signed-in user', async () => {
    const res = await call('POST', '/api/twilio/send-sms', { body: { message: 'hi', to: '+16145550100' } })
    assert.equal(res.status, 401)
  })
})
