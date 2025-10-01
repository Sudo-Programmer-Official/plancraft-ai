// apps/backend-node/services/firebaseAdmin.js
import admin from "firebase-admin"

let serviceAccount = null

// If service account JSON is passed via ENV, parse it
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env", err)
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  })
}

export const db = admin.firestore()