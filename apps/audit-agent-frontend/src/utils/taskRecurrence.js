import dayjs from 'dayjs'
import { toUtcIso } from '@/utils/time'

export const TASK_REPEAT_TYPE_VALUES = ['daily', 'weekly', 'weekend', 'monthly', 'custom']

export function normalizeTaskRepeat(value) {
  if (!value || typeof value !== 'object') return null
  const type = String(value.type || '').trim().toLowerCase()
  if (!TASK_REPEAT_TYPE_VALUES.includes(type)) return null

  if (type === 'custom') {
    const intervalDays = Math.max(1, Math.min(365, Math.trunc(Number(value.intervalDays) || 0)))
    if (!intervalDays) return null
    return { type: 'custom', intervalDays }
  }

  return { type, intervalDays: null }
}

export function normalizeReminderOffsetDays(value, { fallback = 0 } = {}) {
  if (value === null || value === undefined || value === '') return fallback
  const next = Math.trunc(Number(value))
  if (!Number.isFinite(next)) return fallback
  return Math.max(0, Math.min(next, 365))
}

export function isRecurringTask(task) {
  return !!normalizeTaskRepeat(task?.repeat)
}

export function computeNextRecurringDate(dateYmd, repeatInput) {
  const repeat = normalizeTaskRepeat(repeatInput)
  if (!repeat || !dateYmd) return null

  const base = dayjs(String(dateYmd).trim())
  if (!base.isValid()) return null

  if (repeat.type === 'daily') return base.add(1, 'day').format('YYYY-MM-DD')
  if (repeat.type === 'weekly') return base.add(1, 'week').format('YYYY-MM-DD')
  if (repeat.type === 'weekend') {
    const dayOfWeek = base.day()
    if (dayOfWeek === 6 || dayOfWeek === 0) return base.add(7, 'day').format('YYYY-MM-DD')
    return base.add(6 - dayOfWeek, 'day').format('YYYY-MM-DD')
  }
  if (repeat.type === 'monthly') return base.add(1, 'month').format('YYYY-MM-DD')
  return base.add(repeat.intervalDays || 1, 'day').format('YYYY-MM-DD')
}

export function computeReminderScheduleIso({
  date,
  reminderTime,
  timezone,
  reminderOffsetDays = 0,
} = {}) {
  if (!date || !reminderTime) return null
  const offsetDays = normalizeReminderOffsetDays(reminderOffsetDays, { fallback: 0 }) || 0
  const reminderDate = dayjs(String(date).trim()).subtract(offsetDays, 'day')
  if (!reminderDate.isValid()) return null
  return toUtcIso(reminderDate.format('YYYY-MM-DD'), String(reminderTime).trim(), timezone || 'UTC')
}
