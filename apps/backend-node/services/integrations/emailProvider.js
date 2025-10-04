import sgMail from "@sendgrid/mail"
import { db } from "../firebaseAdmin.js"

const API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@plancraftai.com"

if (API_KEY) {
  try {
    sgMail.setApiKey(API_KEY)
    console.log("[Email] SendGrid initialized ✅")
  } catch (err) {
    console.error("[Email] Failed to set API key:", err?.message)
  }
} else {
  console.warn("[Email] SENDGRID_API_KEY not set; email sending disabled 🚫")
}

export async function sendEmail(userId, message, subject = "PlanCraftAI Reminder") {
  if (!API_KEY) return { ok: false, error: "SENDGRID_API_KEY missing" }

  try {
    // 🔹 Step 1: Fetch user’s email
    const snap = await db.collection("users").doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const toEmail = data?.integrations?.email || data?.email

    if (!toEmail) {
      console.warn(`[Email] No email found for user ${userId}`)
      return { ok: false, error: "User email missing" }
    }

    // 🔹 Step 2: Construct message
    const msg = {
      to: String(toEmail).trim(),
      from: String(FROM_EMAIL),
      subject,
      text: message,
      html: `<div style="font-family:sans-serif;font-size:15px;">
               <p>${message}</p>
               <hr/>
               <p style="color:#999">💡 This reminder was sent automatically by PlanCraftAI.</p>
             </div>`,
    }

    // 🔹 Step 3: Send via SendGrid
    const [response] = await sgMail.send(msg)
    console.log(`[Email] Sent to ${toEmail} (${response.statusCode})`)
    return { ok: true, status: response.statusCode }
  } catch (err) {
    console.error("[Email] Send failed:", err?.response?.body || err.message)
    return { ok: false, error: err?.message || "Unknown error" }
  }
}

// Send an email directly to a specific address (bypasses user profile lookup)
export async function sendEmailDirect(to, subject, html, text = '') {
  if (!API_KEY) return { ok: false, error: 'SENDGRID_API_KEY missing' }
  try {
    const msg = {
      to: String(to).trim(),
      from: String(FROM_EMAIL),
      subject,
      text: text || html?.replace(/<[^>]+>/g, ' '),
      html: html || `<div style="font-family:sans-serif;font-size:15px;">${text}</div>`,
    }
    const [response] = await sgMail.send(msg)
    console.log(`[Email] Sent direct to ${to} (${response.statusCode})`)
    return { ok: true, status: response.statusCode }
  } catch (err) {
    console.error('[Email] Direct send failed:', err?.response?.body || err?.message)
    return { ok: false, error: err?.message || 'Unknown error' }
  }
}
