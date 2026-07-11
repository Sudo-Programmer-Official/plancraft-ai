import admin from "firebase-admin";
import {
  resolveAndroidNotificationChannelId,
  resolveAndroidNotificationSound,
  resolveIosNotificationSound,
  normalizeNotificationSound,
} from "../utils/notificationSound.js";

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT env var is not set. Notifications will fail.",
    );
  } else {
    try {
      const creds = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    }
  }
}

const messaging = (() => {
  try {
    return admin.messaging();
  } catch (e) {
    console.error("admin.messaging() unavailable:", e);
    return null;
  }
})();

function normalizeNotificationData(data = {}) {
  if (!data || typeof data !== "object") return {};
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = typeof value === "string" ? value : JSON.stringify(value);
    return acc;
  }, {});
}

export async function sendPushNotification(
  token,
  title,
  body,
  data = {},
  options = {},
) {
  if (!messaging) throw new Error("Firebase admin messaging not initialized");

  const sound = normalizeNotificationSound(
    options.sound || data?.sound || data?.notificationSound,
  );
  const androidChannelId = resolveAndroidNotificationChannelId(sound);

  const message = {
    token,
    notification: { title, body },
    data: normalizeNotificationData({
      ...data,
      sound,
    }),
    android: {
      priority: "high",
      notification: {
        channelId: androidChannelId,
        sound: resolveAndroidNotificationSound(sound),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: resolveIosNotificationSound(sound),
        },
      },
    },
  };

  try {
    const res = await messaging.send(message);
    console.log("Notification sent:", res);
    return res;
  } catch (err) {
    console.error("Error sending notification:", err);
    throw err;
  }
}
