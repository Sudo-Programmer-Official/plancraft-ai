import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { generateTasksFromText } from '@/services/aiService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useTasks } from '@/composables/useTasks'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

dayjs.extend(utc)
dayjs.extend(timezone)

function localTimeZone() {
  return getEffectiveUserTimezone()
}

// Same parsing TaskPlannerDialog uses: honour an explicit offset, otherwise
// read the value as wall-clock time in the user's zone.
function parseLocalMoment(value, tz) {
  if (!value) return null
  try {
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(String(value))) {
      const base = dayjs(value)
      return base.isValid() ? base.tz(tz) : null
    }
    const parsed = dayjs.tz(value, tz, true)
    return parsed.isValid() ? parsed : null
  } catch {
    return null
  }
}

// Turns free text from the capture sheet into tasks. AI splits and schedules
// it; if AI is unavailable (no consent, network, quota) the text is saved as a
// plain task for today so nothing the user typed is lost.
export function useTodayPlan() {
  const { addTask } = useTasks()
  const workspaceStore = useWorkspaceStore()

  async function planFromText(text) {
    const value = String(text || '').trim()
    if (!value) return { created: [], usedAi: false }
    const tz = localTimeZone()
    const today = toLocalDateKey(new Date())

    let items = []
    try {
      const result = await generateTasksFromText(value, {
        planDate: today,
        timezone: tz,
        workspaceId: workspaceStore.activeWorkspaceId || undefined,
        debugLabel: 'TodayCapture',
      })
      items = Array.isArray(result?.items) ? result.items : []
    } catch (error) {
      console.warn('[Today] AI planning unavailable; saving as a plain task', error?.code || error?.message)
    }

    if (!items.length) {
      const task = await addTask({ title: value, date: today, source: 'today_capture' })
      return { created: [task], usedAi: false }
    }

    const created = []
    for (const item of items) {
      // A fallback anchor means the AI found no time in the text.
      const hasRealTime = item.parsedTimeLocal && item.meta?.reason !== 'fallback_plan_date_anchor'
      const moment = hasRealTime ? parseLocalMoment(item.parsedTimeLocal, tz) : null
      created.push(
        await addTask({
          title: item.title,
          details: item.details || '',
          category: item.category,
          date: moment ? moment.format('YYYY-MM-DD') : today,
          ...(moment ? { reminderTime: moment.format('HH:mm'), timezone: tz } : {}),
          source: 'today_capture_ai',
        }),
      )
    }
    return { created, usedAi: true }
  }

  return { planFromText }
}
