import OpenAI from "openai"
import { db } from "./firebaseAdmin.js"
import { send as sendWhatsApp } from "./integrations/whatsappProvider.js"
import { sendEmail } from "./integrations/emailProvider.js"
import { sendPWA } from "./integrations/pwaProvider.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function createReminderFromText(userText, userId, channels = ["whatsapp"], options = {}) {
  if (!userId) throw new Error("Missing userId")
  const text = String(userText || '').trim()
  if (!text) throw new Error("Empty reminder text")

  // 1) Ask GPT to extract a task and time
  let parsed = null
  try {
    const gpt = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract a single reminder from the user's text. Return strict JSON with keys: task (string) and time (ISO8601)." },
        { role: "user", content: `Reminder request: "${text}"` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    })
    const content = gpt?.choices?.[0]?.message?.content || "{}"
    parsed = JSON.parse(content)
  } catch (e) {
    console.warn("parse via GPT failed; falling back", e?.message || e)
  }

  // 2) Fallback heuristics
  if (!parsed || !parsed.time || !parsed.task) {
    parsed = { task: text, time: new Date(Date.now() + 60 * 60 * 1000).toISOString() } // +1h
  }

  const when = new Date(parsed.time)
  if (!(when instanceof Date) || isNaN(when.getTime())) {
    throw new Error("Parsed time invalid")
  }

  const reminder = {
    task: String(parsed.task || text),
    scheduledTime: when,
    userId: String(userId),
    channels: Array.isArray(channels) && channels.length ? channels : ["whatsapp"],
    createdAt: new Date(),
    status: "scheduled",
    sentAt: null,
    taskId: options?.taskId || null,
  }

  const ref = await db.collection("reminders").add(reminder)
  await queueReminder({ id: ref.id, ...reminder })

  try {
    await sendWhatsApp(userId, `✅ Reminder set: "${reminder.task}" at ${when.toLocaleString()}`)
  } catch (e) {
    console.warn("Could not send confirmation via WhatsApp:", e?.message || e)
  }

  return { id: ref.id, ...reminder }
}

export async function sendReminder(reminder) {
  const channels = Array.isArray(reminder?.channels) ? reminder.channels : []
  const userId = String(reminder?.userId || "")
  const task = String(reminder?.task || "")
  const opts = { to: reminder?.to }
  try {
    if (channels.includes("whatsapp")) {
      try { await sendWhatsApp(userId, `⏰ Reminder: ${task}`, opts) } catch (e) {
        console.error("WhatsApp send failed:", e?.message || e)
      }
    }
    if (channels.includes("email")) {
      try { await sendEmail(userId, task) } catch (e) {
        console.error("Email send failed:", e?.message || e)
      }
    }
    if (channels.includes("pwa")) {
      try { await sendPWA(userId, task) } catch (e) {
        console.error("PWA send failed:", e?.message || e)
      }
    }
  } finally {
    await db.collection("reminders").doc(String(reminder.id || reminder._id || "")).set(
      { sentAt: new Date(), status: "sent" },
      { merge: true }
    )
  }
}

// Lightweight in-process queue: schedules a setTimeout to send at scheduledTime
export function queueReminder(rem) {
  try {
    const id = String(rem?.id || rem?._id || "")
    const when = rem?.scheduledTime || rem?.time
    const ts = when instanceof Date ? when : new Date(when)
    const delay = ts.getTime() - Date.now()
    if (!Number.isFinite(delay)) return
    console.log(`[Scheduler] Queued reminder id=${id} taskId=${rem?.taskId || 'n/a'} at=${ts.toISOString()}`)
    const fire = async () => {
      try { await sendReminder({ ...rem, id }) } catch (e) {
        console.error("sendReminder error:", e?.message || e)
      }
    }
    if (delay <= 0) return fire()
    setTimeout(fire, Math.min(delay, 0x7fffffff))
  } catch (e) {
    console.error("queueReminder error:", e)
  }
}
