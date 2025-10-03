export async function sendEmail(userId, message) {
  // Stub: integrate SendGrid/SES later. For now, log.
  console.log(`[email] → user=${userId}: ${message}`)
  return { ok: true }
}

