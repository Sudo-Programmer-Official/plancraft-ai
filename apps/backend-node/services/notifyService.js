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

export async function sendPushNotification(token, title, body) {
  if (!messaging) throw new Error("Firebase admin messaging not initialized")

  const message = {
    token,
    notification: { title, body },
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

