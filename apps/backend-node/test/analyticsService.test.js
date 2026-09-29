import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeAnalyticsProps, trackServerEvent } from '../services/analyticsService.js'

test('drops content and contact fields, keeps ids, enums and counts', () => {
  const out = sanitizeAnalyticsProps({
    source: 'batch',
    channels: ['push', 'sms'],
    has_task: true,
    delivered_channel_count: 2,
    title: 'Call mom',
    task: 'Buy groceries',
    Email: 'a@b.com',
    phone_number: '+15555550100',
    transcript: 'hello',
    context: { location: 'home' },
    long_value: 'x'.repeat(200),
  })
  assert.deepEqual(out, {
    source: 'batch',
    channels: ['push', 'sms'],
    has_task: true,
    delivered_channel_count: 2,
  })
})

test('is a no-op without a Mixpanel token', async () => {
  const prev = process.env.MIXPANEL_TOKEN
  delete process.env.MIXPANEL_TOKEN
  try {
    assert.equal(await trackServerEvent('user-1', 'reminder_created', {}), false)
  } finally {
    if (prev !== undefined) process.env.MIXPANEL_TOKEN = prev
  }
})
