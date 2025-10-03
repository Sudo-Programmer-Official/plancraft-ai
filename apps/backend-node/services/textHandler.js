import { createReminderFromText } from "./reminderService.js"

export async function handleTextReminder(userText, userId, channels) {
  return await createReminderFromText(userText, userId, channels)
}

