// frontend/src/utils/timeSequencer.js
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Adjusts task times based on their temporal relationships
 * (lightweight frontend version)
 */
export function autoAdjustTimes({
  tasks = [],
  timeRelations = [],
  startTime = new Date().toISOString(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultGapMinutes = 15
}) {
  if (!tasks.length) return []

  const tzStart = dayjs.tz(startTime, timezone)
  const adjusted = [...tasks]
  const processed = new Set()
  const scheduled = new Map()

  // Handle absolute times
  adjusted.forEach((task, i) => {
    if (task.time?.type === 'absolute' && task.time.value) {
      const t = dayjs.tz(task.time.value, timezone)
      if (t.isValid()) {
        scheduled.set(i, t)
        processed.add(i)
      }
    }
  })

  // Handle relations (simple chain)
  timeRelations.forEach((rel) => {
    const { taskId, followsTaskId, parallelWithTaskId, minimumGapMinutes } = rel
    const gap = minimumGapMinutes ?? defaultGapMinutes

    if (followsTaskId && scheduled.has(followsTaskId - 1)) {
      const base = scheduled.get(followsTaskId - 1)
      scheduled.set(taskId - 1, base.add(gap, 'minutes'))
      processed.add(taskId - 1)
    } else if (parallelWithTaskId && scheduled.has(parallelWithTaskId - 1)) {
      scheduled.set(taskId - 1, scheduled.get(parallelWithTaskId - 1))
      processed.add(taskId - 1)
    }
  })

  // Fill missing tasks sequentially
  let lastTime = tzStart
  adjusted.forEach((_, i) => {
    if (!scheduled.has(i)) {
      lastTime = lastTime.add(defaultGapMinutes, 'minutes')
      scheduled.set(i, lastTime)
    }
  })

  // Return tasks with scheduledTime
  return adjusted.map((task, i) => ({
    ...task,
    scheduledTime: scheduled.get(i)?.utc().toISOString() || null
  }))
}