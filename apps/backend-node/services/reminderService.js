// import OpenAI from "openai"
// import { db } from "./firebaseAdmin.js"
// import { send as sendWhatsApp } from "./integrations/whatsappProvider.js"
// import { sendEmail } from "./integrations/emailProvider.js"
// import { sendPWA } from "./integrations/pwaProvider.js"

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// export async function createReminderFromText(userText, userId, channels = ["whatsapp"], options = {}) {
//   if (!userId) throw new Error("Missing userId")
//   const text = String(userText || '').trim()
//   if (!text) throw new Error("Empty reminder text")

//   // 1) Ask GPT to extract a task and time
//   let parsed = null
//   let when = null

//   // If caller provided a concrete scheduledTime, prefer it and skip GPT
//   if (options?.scheduledTime) {
//     try {
//       when = new Date(options.scheduledTime)
//       if (!(when instanceof Date) || isNaN(when.getTime())) throw new Error('invalid scheduledTime')
//       parsed = { task: text, time: when.toISOString() }
//     } catch (e) {
//       console.warn('scheduledTime invalid; falling back to GPT parse', e?.message || e)
//     }
//   }

//   if (!parsed) {
//     try {
//       const gpt = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [
//           { role: "system", content: "Extract a single reminder from the user's text. Return strict JSON with keys: task (string) and time (ISO8601)." },
//           { role: "user", content: `Reminder request: "${text}"` },
//         ],
//         response_format: { type: "json_object" },
//         temperature: 0.2,
//       })
//       const content = gpt?.choices?.[0]?.message?.content || "{}"
//       parsed = JSON.parse(content)
//     } catch (e) {
//       console.warn("parse via GPT failed; falling back", e?.message || e)
//     }
//   }

//   // 2) Fallback heuristics
//   if (!parsed || !parsed.time || !parsed.task) {
//     parsed = { task: text, time: new Date(Date.now() + 60 * 60 * 1000).toISOString() } // +1h
//   }

//   when = when || new Date(parsed.time)
//   if (!(when instanceof Date) || isNaN(when.getTime())) {
//     throw new Error("Parsed time invalid")
//   }

//   const reminder = {
//     task: String(parsed.task || text),
//     scheduledTime: when,
//     userId: String(userId),
//     channels: Array.isArray(channels) && channels.length ? channels : ["whatsapp"],
//     createdAt: new Date(),
//     status: "scheduled",
//     sentAt: null,
//     taskId: options?.taskId || null,
//   }

//   console.log('[Reminder API] Persisting reminder', {
//     userId: reminder.userId,
//     taskId: reminder.taskId,
//     when: reminder.scheduledTime?.toISOString?.(),
//     channels: reminder.channels,
//   })
//   const ref = await db.collection("reminders").add(reminder)
//   console.log('[Reminder API] Stored reminder docId=', ref.id)
//   await queueReminder({ id: ref.id, ...reminder })

//   try {
//     await sendWhatsApp(userId, `✅ Reminder set: "${reminder.task}" at ${when.toLocaleString()}`)
//   } catch (e) {
//     console.warn("Could not send confirmation via WhatsApp:", e?.message || e)
//   }

//   return { id: ref.id, ...reminder }
// }

// export async function sendReminder(reminder) {
//   const channels = Array.isArray(reminder?.channels) ? reminder.channels : []
//   const userId = String(reminder?.userId || "")
//   const task = String(reminder?.task || "")
//   const opts = { to: reminder?.to }
//   try {
//     console.log('[Scheduler] Executing reminder', {
//       id: reminder?.id,
//       userId,
//       task,
//       channels,
//       ts: new Date().toISOString(),
//     })
//     if (channels.includes("whatsapp")) {
//       try {
//         const r = await sendWhatsApp(userId, `⏰ Reminder: ${task}`, opts)
//         console.log('[Delivery] WhatsApp ok', { userId, id: reminder?.id, result: r })
//       } catch (e) {
//         console.error("WhatsApp send failed:", e?.message || e)
//       }
//     }
//     if (channels.includes("email")) {
//       try { const r = await sendEmail(userId, task); console.log('[Delivery] Email ok', { userId, id: reminder?.id, result: r }) } catch (e) {
//         console.error("Email send failed:", e?.message || e)
//       }
//     }
//     if (channels.includes("pwa")) {
//       try { const r = await sendPWA(userId, task); console.log('[Delivery] PWA ok', { userId, id: reminder?.id, result: r }) } catch (e) {
//         console.error("PWA send failed:", e?.message || e)
//       }
//     }
//   } finally {
//     await db.collection("reminders").doc(String(reminder.id || reminder._id || "")).set(
//       { sentAt: new Date(), status: "sent" },
//       { merge: true }
//     )
//   }
// }

// // Lightweight in-process queue: schedules a setTimeout to send at scheduledTime
// export function queueReminder(rem) {
//   try {
//     const id = String(rem?.id || rem?._id || "")
//     const when = rem?.scheduledTime || rem?.time
//     const ts = when instanceof Date ? when : new Date(when)
//     const delay = ts.getTime() - Date.now()
//     if (!Number.isFinite(delay)) return
//     console.log(`[Scheduler] Queued reminder id=${id} taskId=${rem?.taskId || 'n/a'} at=${ts.toISOString()}`)
//     const fire = async () => {
//       try { await sendReminder({ ...rem, id }) } catch (e) {
//         console.error("sendReminder error:", e?.message || e)
//       }
//     }
//     if (delay <= 0) { console.log('[Scheduler] Firing overdue reminder immediately', { id, at: ts.toISOString() }); return fire() }
//     setTimeout(fire, Math.min(delay, 0x7fffffff))
//   } catch (e) {
//     console.error("queueReminder error:", e)
//   }
// }
/**
 * Reminder Service (Template-based)
 * PlanCraftAI — End-to-End Reminder Orchestration
 */

import OpenAI from "openai"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
import timezone from "dayjs/plugin/timezone.js"
import { db } from "./firebaseAdmin.js"
import { send as sendWhatsApp } from "./integrations/whatsappProvider.js"
import { sendEmail } from "./integrations/emailProvider.js"
import { sendPWA } from "./integrations/pwaProvider.js"

dayjs.extend(utc)
dayjs.extend(timezone)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ---------------------------------------------
// 1️⃣ CREATE REMINDER (Parse + Store + Queue)
// ---------------------------------------------
export async function createReminderFromText(userText, userId, channels = ["whatsapp"], options = {}) {
  if (!userId) throw new Error("Missing userId")

  const text = String(userText || '').trim()
  if (!text) throw new Error("Empty reminder text")

  let parsed = null
  let when = null

  // Prefer concrete scheduledTime if provided
  if (options?.scheduledTime) {
    try {
      when = new Date(options.scheduledTime)
      if (!(when instanceof Date) || isNaN(when.getTime())) throw new Error('Invalid scheduledTime')
      parsed = { task: text, time: when.toISOString() }
    } catch (e) {
      console.warn('[Reminder] Invalid scheduledTime, falling back to GPT:', e?.message)
    }
  }

  // GPT-assisted parsing if not provided
  if (!parsed) {
    try {
      const gpt = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract a reminder from text. Return JSON: { task: string, time: ISO8601 string }"
          },
          { role: "user", content: `Reminder request: "${text}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
      const content = gpt?.choices?.[0]?.message?.content || "{}"
      parsed = JSON.parse(content)
    } catch (e) {
      console.warn("[Reminder] GPT parse failed; fallback:", e?.message)
    }
  }

  // Fallback heuristic (+1h if GPT parse fails)
  if (!parsed || !parsed.task || !parsed.time) {
    parsed = { task: text, time: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
  }

  when = when || new Date(parsed.time)
  if (!(when instanceof Date) || isNaN(when.getTime())) {
    throw new Error("Parsed time invalid")
  }

  const reminder = {
    task: parsed.task,
    scheduledTime: when,
    userId: String(userId),
    channels: Array.isArray(channels) && channels.length ? channels : ["whatsapp"],
    createdAt: new Date(),
    status: "scheduled",
    sentAt: null,
    taskId: options?.taskId || null
  }

  console.log('[Reminder] Persisting reminder', {
    userId: reminder.userId,
    taskId: reminder.taskId,
    when: reminder.scheduledTime?.toISOString?.(),
    channels: reminder.channels
  })

  const ref = await db.collection("reminders").add(reminder)
  console.log('[Reminder] Stored docId =', ref.id)

  await queueReminder({ id: ref.id, ...reminder })

  // ✅ Confirmation via WhatsApp template
  try {
    await sendWhatsApp(userId, {
      template: "reminder_notification",
      headerVars: ["⏰"],
      bodyVars: [reminder.task, formatLocalTime(when)],
    })
  } catch (e) {
    console.warn("[Reminder] WhatsApp confirmation failed:", e?.message)
  }

  return { id: ref.id, ...reminder }
}

// ---------------------------------------------
// 2️⃣ SEND REMINDER (Triggered by Scheduler)
// ---------------------------------------------
export async function sendReminder(reminder) {
  const channels = Array.isArray(reminder?.channels) ? reminder.channels : []
  const userId = String(reminder?.userId || "")
  const task = String(reminder?.task || "")
  const when = reminder?.scheduledTime ? formatLocalTime(reminder.scheduledTime) : "soon"

  console.log('[Scheduler] Executing reminder', {
    id: reminder?.id,
    userId,
    task,
    when,
    channels,
    ts: new Date().toISOString()
  })

  try {
    // WhatsApp — use template message
    if (channels.includes("whatsapp")) {
      try {
        const r = await sendWhatsApp(userId, {
          template: "reminder_notification",
          headerVars: ["⏰"],
          bodyVars: [task, when],
        })
        console.log('[Delivery] WhatsApp ok', { userId, id: reminder?.id, result: r })
      } catch (e) {
        console.error("[Delivery] WhatsApp send failed:", e?.message)
      }
    }

    // Email fallback
    if (channels.includes("email")) {
      try {
        const r = await sendEmail(userId, task)
        console.log('[Delivery] Email ok', { userId, id: reminder?.id, result: r })
      } catch (e) {
        console.error("[Delivery] Email send failed:", e?.message)
      }
    }

    // PWA fallback
    if (channels.includes("pwa")) {
      try {
        const r = await sendPWA(userId, task)
        console.log('[Delivery] PWA ok', { userId, id: reminder?.id, result: r })
      } catch (e) {
        console.error("[Delivery] PWA send failed:", e?.message)
      }
    }

  } finally {
    await db.collection("reminders")
      .doc(String(reminder.id || reminder._id || ""))
      .set({ sentAt: new Date(), status: "sent" }, { merge: true })
  }
}

// ---------------------------------------------
// 3️⃣ QUEUE REMINDER (Timeout Scheduler)
// ---------------------------------------------
export function queueReminder(rem) {
  try {
    const id = String(rem?.id || rem?._id || "")
    const when = rem?.scheduledTime || rem?.time
    const ts = when instanceof Date ? when : new Date(when)
    const delay = ts.getTime() - Date.now()

    if (!Number.isFinite(delay)) return

    console.log(`[Scheduler] Queued reminder id=${id} taskId=${rem?.taskId || 'n/a'} at=${ts.toISOString()}`)

    const fire = async () => {
      try { await sendReminder({ ...rem, id }) }
      catch (e) { console.error("sendReminder error:", e?.message) }
    }

    if (delay <= 0) {
      console.log('[Scheduler] Firing overdue reminder immediately', { id, at: ts.toISOString() })
      return fire()
    }

    setTimeout(fire, Math.min(delay, 0x7fffffff))
  } catch (e) {
    console.error("queueReminder error:", e)
  }
}

// ---------------------------------------------
// 4️⃣ HELPER — LOCAL TIME FORMATTER
// ---------------------------------------------
function formatLocalTime(date) {
  try {
    const d = dayjs(date).tz("America/Chicago") // default fallback
    return d.format("hh:mm A")
  } catch {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
}