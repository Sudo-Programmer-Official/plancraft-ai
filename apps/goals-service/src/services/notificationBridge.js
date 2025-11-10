import webpush from "web-push";
import { db } from "../lib/firebaseAdmin.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@plancraftai.com";

let vapidReady = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidReady = true;
  } catch (err) {
    console.warn("[GoalsService] webpush init failed", err?.message || err);
    vapidReady = false;
  }
} else {
  console.warn("[GoalsService] VAPID keys missing; goal push disabled");
}

export function canSendGoalPush() {
  return vapidReady;
}

function normalizeMessage(payload = {}) {
  if (typeof payload === "string") {
    return { title: "PlanCraftAI", body: payload };
  }
  return {
    title: payload.title || "PlanCraftAI Goal Update",
    body: payload.body || payload.message || "Keep going — your goals are within reach.",
    data: payload.data || undefined,
  };
}

export async function sendGoalPush(userId, payload = {}) {
  if (!canSendGoalPush() || !userId) return { ok: false };
  try {
    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    const subs = Array.isArray(data?.integrations?.pwa?.subscriptions)
      ? data.integrations.pwa.subscriptions
      : [];
    if (!subs.length) return { ok: false, error: "no_subscriptions" };

    const message = normalizeMessage(payload);
    const payloadJson = JSON.stringify({
      title: message.title,
      body: message.body,
      icon: "/icons/icon-192x192.png",
      data: message.data,
    });

    let delivered = 0;
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payloadJson);
          delivered += 1;
        } catch (err) {
          console.warn("[GoalsService] push send failed", err?.message || err);
        }
      }),
    );
    return { ok: delivered > 0, delivered };
  } catch (err) {
    console.error("[GoalsService] sendGoalPush failed", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}
