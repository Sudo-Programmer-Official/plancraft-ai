import admin from "firebase-admin"

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var is not set. Notifications will fail.")
  } else {
    try {
      const creds = JSON.parse(raw)
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      })
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e)
    }
  }
}

const messaging = (() => {
  try {
    return admin.messaging()
  } catch (e) {
    console.error("admin.messaging() unavailable:", e)
    return null
  }
})()

function normalizeNotificationData(data = {}) {
  if (!data || typeof data !== 'object') return {}
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) return acc
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value)
    return acc
  }, {})
}

export async function sendPushNotification(token, title, body, data = {}) {
  if (!messaging) throw new Error("Firebase admin messaging not initialized")

  const message = {
    token,
    notification: { title, body },
    data: normalizeNotificationData(data),
  }

  try {
    const res = await messaging.send(message)
    console.log("Notification sent:", res)
    return res
  } catch (err) {
    console.error("Error sending notification:", err)
    throw err
  }
}
