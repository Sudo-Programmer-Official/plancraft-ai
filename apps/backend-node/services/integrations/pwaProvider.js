export async function sendPWA(userId, message) {
  // Stub: integrate Web Push later. For now, log.
  console.log(`[pwa] → user=${userId}: ${message}`)
  return { ok: true }
}

