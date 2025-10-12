import { updateTaskInFirebase } from '@/services/firebaseService'

export function useTaskEdit() {
  async function persistEdits(task) {
    if (!task?.id) return
    const payload = { ...task }
    // Late completion tagging
    try {
      if (payload.__wasLate) {
        const tDate = new Date(payload.date)
        const now = new Date()
        const delayDays = Math.max(0, Math.round((now - tDate) / (1000*60*60*24)))
        const logs = Array.isArray(payload.logs) ? payload.logs.slice() : []
        logs.push({ type: 'completed', late: true, delayDays, at: new Date().toISOString() })
        payload.logs = logs
        delete payload.__wasLate
      }
    } catch {}
    await updateTaskInFirebase(payload)
  }
  return { persistEdits }
}

