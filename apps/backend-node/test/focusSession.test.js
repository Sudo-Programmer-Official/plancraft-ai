import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFocusSession } from '../utils/focusSession.js'

const base = {
  taskId: 'task-1',
  taskTitle: 'Work on Design System',
  plannedMinutes: 25,
  startedAt: '2026-09-28T10:00:00.000Z',
  endedAt: '2026-09-28T10:30:00.000Z',
  focusedMs: 25 * 60 * 1000,
  outcome: 'completed_task',
}

test('accepts a valid finished session', () => {
  const { session, error } = normalizeFocusSession(base)
  assert.equal(error, undefined)
  assert.equal(session.taskId, 'task-1')
  assert.equal(session.plannedMinutes, 25)
  assert.equal(session.focusedMs, 25 * 60 * 1000)
  assert.equal(session.outcome, 'completed_task')
})

test('treats missing plannedMinutes as open-ended and unknown outcome as ended', () => {
  const { session } = normalizeFocusSession({ ...base, plannedMinutes: null, outcome: 'hack' })
  assert.equal(session.plannedMinutes, null)
  assert.equal(session.outcome, 'ended')
})

test('rejects missing task, bad dates and inflated focus time', () => {
  assert.ok(normalizeFocusSession({ ...base, taskId: '' }).error)
  assert.ok(normalizeFocusSession({ ...base, startedAt: 'nope' }).error)
  assert.ok(normalizeFocusSession({ ...base, endedAt: '2026-09-28T09:00:00.000Z' }).error)
  assert.ok(normalizeFocusSession({ ...base, focusedMs: 60 * 60 * 1000 }).error)
  assert.ok(normalizeFocusSession({ ...base, focusedMs: -1 }).error)
})
