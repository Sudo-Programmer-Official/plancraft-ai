import assert from 'node:assert/strict'
import { parseVoiceTaskIntent } from '../src/utils/taskVoiceParser.js'

function runCase(label, input, assertion) {
  const parsed = parseVoiceTaskIntent(input, { now: new Date('2026-03-26T12:00:00Z') })
  assertion(parsed)
  console.log(`ok - ${label}`)
}

runCase('custom repeat gets default reminder', 'remind me every 50 days to update WhatsApp token', (parsed) => {
  assert.equal(parsed.repeat?.type, 'custom')
  assert.equal(parsed.repeat?.intervalDays, 50)
  assert.equal(parsed.reminder?.offsetDays, 2)
  assert.equal(parsed.reminder?.includeOnDue, true)
  assert.equal(parsed.title, 'Update WhatsApp token')
})

runCase('explicit reminder offset wins', 'remind me every 7 days 1 day before', (parsed) => {
  assert.equal(parsed.repeat?.type, 'custom')
  assert.equal(parsed.repeat?.intervalDays, 7)
  assert.equal(parsed.reminder?.offsetDays, 1)
  assert.equal(parsed.reminder?.includeOnDue, true)
})

runCase('word-based offset is supported', 'remind me every 50 days to update WhatsApp token two days before', (parsed) => {
  assert.equal(parsed.repeat?.type, 'custom')
  assert.equal(parsed.repeat?.intervalDays, 50)
  assert.equal(parsed.reminder?.offsetDays, 2)
  assert.equal(parsed.title, 'Update WhatsApp token')
})

runCase('simple reminder keeps title only', 'remind me to update token', (parsed) => {
  assert.equal(parsed.repeat, undefined)
  assert.equal(parsed.reminder, undefined)
  assert.equal(parsed.title, 'Update token')
})

runCase('contextual travel task keeps destination and action', 'tomorrow I have to go to college to print the slide', (parsed) => {
  assert.equal(parsed.title, 'Go to college to print the slide')
  assert.ok(parsed.dueDate)
  assert.equal(parsed.meta?.hasClearTitle, true)
})

runCase('reminder phrasing still keeps destination context', 'remind me tomorrow to go to college to print the slide', (parsed) => {
  assert.equal(parsed.title, 'Go to college to print the slide')
  assert.ok(parsed.dueDate)
  assert.equal(parsed.meta?.hasClearTitle, true)
})

runCase('same-day reminder omits offset', 'remind me on that day', (parsed) => {
  assert.equal(parsed.reminder?.includeOnDue, true)
  assert.equal('offsetDays' in (parsed.reminder || {}), false)
})
