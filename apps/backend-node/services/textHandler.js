import { createReminderFromText } from "./reminderService.js"

export async function handleTextReminder(userText, userId, channels, options = {}) {
  return await createReminderFromText(userText, userId, channels, options)
}
