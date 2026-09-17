// Lightweight timezone sanity tests for CI/local
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { toUtcIso, toLocalHHMM, toJsDate } from '../src/utils/time.js'

dayjs.extend(utc)
dayjs.extend(timezone)

function log(msg) { console.log(msg) }
function fail(msg) { console.error(msg); process.exitCode = 1 }
function assertEqual(a, b, label) {
  if (a !== b) fail(`FAIL: ${label} => expected ${b}, got ${a}`)
}

// Test cases across zones and DST edges
const cases = [
  // US DST start 2024-03-10
  { tz: 'America/Los_Angeles', date: '2024-03-10', time: '01:30' },
  { tz: 'America/New_York',    date: '2024-03-10', time: '01:30' },
  // US DST end 2024-11-03 (ambiguous 01:30)
  { tz: 'America/Los_Angeles', date: '2024-11-03', time: '01:30' },
  { tz: 'America/New_York',    date: '2024-11-03', time: '01:30' },
  // EU DST start/end
  { tz: 'Europe/London',       date: '2024-03-31', time: '01:30' },
  { tz: 'Europe/London',       date: '2024-10-27', time: '01:30' },
  // Non-DST zones
  { tz: 'Asia/Kolkata',        date: '2024-06-15', time: '17:00' },
  { tz: 'Australia/Sydney',    date: '2024-12-15', time: '17:00' },
]

let passed = 0
for (const c of cases) {
  const { tz, date, time } = c
  const expectedUtc = dayjs.tz(`${date}T${time}`, tz).utc().toISOString()
  const gotUtc = toUtcIso(date, time, tz)
  assertEqual(gotUtc, expectedUtc, `${tz} ${date} ${time} toUtcIso`)

  const backHHMM = toLocalHHMM(gotUtc, tz)
  const expectedLocalHHMM = dayjs.utc(expectedUtc).tz(tz).format('HH:mm')
  assertEqual(backHHMM, expectedLocalHHMM, `${tz} ${date} ${time} roundtrip HH:mm`)

  const jsDate = toJsDate(gotUtc)
  if (!(jsDate instanceof Date) || isNaN(jsDate.getTime())) {
    fail(`FAIL: toJsDate invalid for ${tz} ${date} ${time}`)
  }

  passed++
}

if (!process.exitCode) {
  log(`PASS: ${passed} timezone cases OK`)
}
