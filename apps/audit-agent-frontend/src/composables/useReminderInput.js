import { aiIsoToLocalWall, ensureUtcIso, getUserTz, toUtcIso } from '@/utils/timeUtils'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'

// Centralizes reminder prefill + UTC conversion so Morning/Evening
// quick-adds behave like TaskPlannerDialog.
export function useReminderInput() {
  const tz = getUserTz()

  // Prefill date + HH:mm in local wall‑clock from an AI ISO.
  function prefillFromAi(aiIso, selectedDateRef, reminderTimeRef) {
    try {
      const local = aiIsoToLocalWall(aiIso, tz)
      if (!local) return
      const date = local.format('YYYY-MM-DD')
      const time = local.format('HH:mm')
      if (date) selectedDateRef.value = date
      if (time) reminderTimeRef.value = time
    } catch {}
  }

  // Build a single UTC ISO for scheduling (store UTC, show local).
  // If user provided a wall‑clock time, prefer that.
  function toUtcForSchedule(dateStr, timeStr, aiIso) {
    try {
      const manual = timeStr
        ? toUtcIso(toLocalDateKey(parseLocalDateKey(dateStr)), timeStr, tz)
        : null
      return ensureUtcIso(manual || aiIso, tz)
    } catch {
      return ensureUtcIso(aiIso, tz)
    }
  }

  return { tz, prefillFromAi, toUtcForSchedule }
}

