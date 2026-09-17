import express from "express";
import admin from "firebase-admin";
import { db } from "../services/firebaseAdmin.js";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { normalizePhone, guessCountry } from "../utils/phone.js";
import { normalizeNotificationSound } from "../utils/notificationSound.js";
import { makeCallForUser } from "../services/twilioService.js";
import { sendPushNotification } from "../services/notifyService.js";

const router = express.Router();
router.use(requireAuth, ensureUserMatches);

const CHANNEL_ALLOW_LIST = ["email", "pwa", "whatsapp", "sms", "voice_call"];
const ACTION_INBOX_NUDGE_CHANNELS = ["email", "pwa", "whatsapp"];
const ACTION_INBOX_NUDGE_URGENCY = ["important", "urgent_only"];
const MORNING_CALL_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function clampMinutes(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(Math.max(Math.round(num), 1), 24 * 60);
}

function clampActionInboxNudgeCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(Math.max(Math.round(num), 1), 3);
}

function normalizeActionInboxUrgency(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (ACTION_INBOX_NUDGE_URGENCY.includes(normalized)) return normalized;
  if (normalized === "urgent-only") return "urgent_only";
  return null;
}

function parseDateInput(value) {
  if (value === null) return null;
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sanitizeMorningCoachPrefs(raw = {}) {
  const out = {};
  if (raw.enabled !== undefined) out.enabled = !!raw.enabled;
  if (raw.firstCallTime !== undefined) {
    const time = String(raw.firstCallTime || "").trim();
    out.firstCallTime = MORNING_CALL_TIME_RE.test(time) ? time : "09:00";
  }
  if (raw.customMessage !== undefined) {
    const customMessage = String(raw.customMessage || "").trim();
    out.customMessage = customMessage ? customMessage.slice(0, 600) : "";
  }
  return out;
}

// POST /api/settings/updatePreferences
router.post("/settings/updatePreferences", async (req, res) => {
  try {
    const { userId, preferences } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Normalize channels list if supplied
    const inChannels = Array.isArray(preferences?.notifications?.channels)
      ? preferences.notifications.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c))
      : undefined;

    const reminderPref = preferences?.reminders || {};
    const reminderChannels = Array.isArray(reminderPref?.channels)
      ? reminderPref.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c))
      : undefined;
    const reminderPayload = {};
    if (reminderPref?.enabled !== undefined)
      reminderPayload.enabled = !!reminderPref.enabled;
    if (reminderChannels) reminderPayload.channels = reminderChannels;
    const reminderSound = normalizeNotificationSound(
      reminderPref?.sound ??
        preferences?.notifications?.sound ??
        preferences?.notifications?.notificationSound,
    );
    if (
      reminderPref?.sound !== undefined ||
      preferences?.notifications?.sound !== undefined ||
      preferences?.notifications?.notificationSound !== undefined
    ) {
      reminderPayload.sound = reminderSound;
    }

    const actionInboxPref =
      preferences?.notifications?.actionInboxNudges ||
      preferences?.actionInboxNudges ||
      {};
    const actionInboxChannels = Array.isArray(actionInboxPref?.channels)
      ? actionInboxPref.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => ACTION_INBOX_NUDGE_CHANNELS.includes(c))
      : undefined;
    const actionInboxPayload = {};
    if (actionInboxPref?.enabled !== undefined)
      actionInboxPayload.enabled = !!actionInboxPref.enabled;
    if (
      actionInboxPref?.dailyDigest !== undefined ||
      actionInboxPref?.daily_digest !== undefined
    ) {
      actionInboxPayload.dailyDigest = !!(
        actionInboxPref?.dailyDigest ?? actionInboxPref?.daily_digest
      );
    }
    const actionInboxUrgency = normalizeActionInboxUrgency(
      actionInboxPref?.urgency,
    );
    if (actionInboxUrgency) actionInboxPayload.urgency = actionInboxUrgency;
    const actionInboxMax = clampActionInboxNudgeCount(
      actionInboxPref?.maxPerSuggestion ?? actionInboxPref?.max_per_suggestion,
    );
    if (actionInboxMax !== null)
      actionInboxPayload.maxPerSuggestion = actionInboxMax;
    if (actionInboxChannels)
      actionInboxPayload.channels = Array.from(new Set(actionInboxChannels));
    const actionInboxDigestChannels = Array.isArray(
      actionInboxPref?.digestChannels || actionInboxPref?.digest_channels,
    )
      ? (actionInboxPref?.digestChannels || actionInboxPref?.digest_channels)
          .map((c) => String(c).toLowerCase())
          .filter((c) => ACTION_INBOX_NUDGE_CHANNELS.includes(c))
      : undefined;
    if (actionInboxDigestChannels) {
      actionInboxPayload.digestChannels = Array.from(
        new Set(actionInboxDigestChannels),
      );
    }

    const hasNotificationSound =
      preferences?.notifications?.sound !== undefined ||
      preferences?.notifications?.notificationSound !== undefined ||
      preferences?.reminders?.sound !== undefined;
    const notificationSound = hasNotificationSound
      ? normalizeNotificationSound(
          preferences?.notifications?.sound ??
            preferences?.notifications?.notificationSound ??
            preferences?.reminders?.sound,
        )
      : undefined;

    const meetingPref = preferences?.meetings || {};
    const meetingPayload = {};
    if (meetingPref?.autoCreateCalendarTasks !== undefined) {
      meetingPayload.autoCreateCalendarTasks =
        !!meetingPref.autoCreateCalendarTasks;
    }
    const defaultMinutes =
      meetingPref?.defaultReminderMinutes ??
      meetingPref?.defaultMeetingReminderMinutes;
    const clampedMinutes = clampMinutes(defaultMinutes);
    if (clampedMinutes !== null) {
      meetingPayload.defaultReminderMinutes = clampedMinutes;
    }
    const morningCoachPayload = sanitizeMorningCoachPrefs(
      preferences?.morningCoach || {},
    );

    await db
      .collection("users")
      .doc(userId)
      .set(
        {
          preferences: {
            notifications: {
              email: !!preferences?.notifications?.email,
              push: !!preferences?.notifications?.push,
              whatsapp: !!preferences?.notifications?.whatsapp,
              discord: !!preferences?.notifications?.discord,
              calls: !!preferences?.notifications?.calls,
              // new granular flags
              sms: !!preferences?.notifications?.sms,
              voice_call: !!preferences?.notifications?.voice_call,
              ...(notificationSound ? { sound: notificationSound } : {}),
              // persist channels array when provided
              ...(inChannels ? { channels: inChannels } : {}),
              ...(Object.keys(actionInboxPayload).length
                ? { actionInboxNudges: actionInboxPayload }
                : {}),
            },
            ...(Object.keys(reminderPayload).length
              ? { reminders: reminderPayload }
              : {}),
            integrations: {
              googleCalendar: !!preferences?.integrations?.googleCalendar,
              slack: !!preferences?.integrations?.slack,
              discord: !!preferences?.integrations?.discord,
              outlook: !!preferences?.integrations?.outlook,
              whatsapp: !!preferences?.integrations?.whatsapp,
            },
            ...(Object.keys(meetingPayload).length
              ? { meetings: meetingPayload }
              : {}),
            ...(Object.keys(morningCoachPayload).length
              ? { morningCoach: morningCoachPayload }
              : {}),
          },
          updatedAt: new Date(),
        },
        { merge: true },
      );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ updatePreferences error:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

router.post("/settings/test-morning-call", async (req, res) => {
  try {
    const { userId, message } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const text = String(message || "").trim();
    if (!text) return res.status(400).json({ error: "Missing message" });

    await makeCallForUser(String(userId), text, {
      source: "settings_test_morning_call",
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ test-morning-call error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to send test morning call" });
  }
});

// POST /api/settings/welcome-call
// Body: { userId, force?: boolean }
router.post("/settings/welcome-call", async (req, res) => {
  try {
    const { userId, force } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const ref = db.collection("users").doc(String(userId));
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const onboarding = data?.preferences?.onboarding || {};
    const alreadyCalledAt = onboarding?.welcomeCallSentAt || null;

    if (alreadyCalledAt && force !== true) {
      return res.json({
        success: true,
        skipped: true,
        reason: "already_sent",
        welcomeCallSentAt: alreadyCalledAt,
      });
    }

    const message =
      "Hi, this is PlanCraft AI. Save this number as PlanCraft AI to recognize future reminder calls. " +
      "You can reply on WhatsApp or adjust channels in Settings anytime. Welcome aboard.";

    const sid = await makeCallForUser(String(userId), message, {
      source: "welcome_intro",
      bypassChecks: force === true,
    });

    const nowIso = new Date().toISOString();
    await ref.set(
      {
        preferences: {
          onboarding: {
            welcomeCallSentAt: nowIso,
            welcomeCallSid: sid || null,
          },
        },
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return res.json({
      success: true,
      sid: sid || null,
      welcomeCallSentAt: nowIso,
    });
  } catch (err) {
    const status = /phone not configured/i.test(String(err?.message || ""))
      ? 400
      : 500;
    console.error("❌ welcome-call error:", err);
    return res
      .status(status)
      .json({ error: err?.message || "Failed to send welcome call" });
  }
});

// GET /api/settings/preferences?userId=...
router.get("/settings/preferences", async (req, res) => {
  try {
    const { userId } = req.query || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    res.json({ preferences: data?.preferences || {} });
  } catch (err) {
    console.error("❌ getPreferences error:", err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.get("/settings/profile", async (req, res) => {
  try {
    const { userId } = req.query || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    res.json({ profile: data || {} });
  } catch (err) {
    console.error("❌ getProfile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/settings/native-push/register", async (req, res) => {
  try {
    const uid = String(req?.user?.uid || "");
    const { pushToken, pushTokenPlatform, pushPermissionState, deviceId } =
      req.body || {};
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    if (!String(pushToken || "").trim()) {
      return res.status(400).json({ error: "Missing pushToken" });
    }
    const normalizedDeviceId = String(deviceId || "").trim().replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 160);
    if (!normalizedDeviceId) {
      return res.status(400).json({ error: "Missing deviceId" });
    }

    const platform = String(pushTokenPlatform || "")
      .trim()
      .toLowerCase();
    const normalizedPlatform =
      platform === "android" || platform === "ios" ? platform : null;
    const permissionState =
      String(pushPermissionState || "")
        .trim()
        .toLowerCase() || "granted";

    const now = new Date().toISOString();
    const userRef = db.collection("users").doc(uid);
    await Promise.all([
      userRef.collection("nativePushDevices").doc(normalizedDeviceId).set(
        {
          deviceId: normalizedDeviceId,
          pushToken: String(pushToken).trim(),
          pushTokenPlatform: normalizedPlatform,
          pushPermissionState: permissionState,
          active: true,
          updatedAt: now,
        },
        { merge: true },
      ),
      userRef.set(
        {
          // Keep the legacy fields for older senders while the device
          // subcollection supports multiple phones/tablets per user.
          pushToken: String(pushToken).trim(),
          pushTokenPlatform: normalizedPlatform,
          pushPermissionState: permissionState,
          pushTokenUpdatedAt: now,
          pushTokenDeviceId: normalizedDeviceId,
        },
        { merge: true },
      ),
    ]);

    return res.json({
      success: true,
      deviceId: normalizedDeviceId,
      pushTokenPlatform: normalizedPlatform,
      pushPermissionState: permissionState,
      pushTokenUpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ native-push register error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to register native push token" });
  }
});

router.get("/settings/native-push/status", async (req, res) => {
  try {
    const uid = String(req?.user?.uid || "");
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const userRef = db.collection("users").doc(uid);
    const [profileSnap, devicesSnap] = await Promise.all([
      userRef.get(),
      userRef.collection("nativePushDevices").where("active", "==", true).get(),
    ]);
    const profile = profileSnap.exists ? profileSnap.data() || {} : {};
    const devices = devicesSnap.docs.map((entry) => ({
      deviceId: entry.id,
      pushToken: entry.data()?.pushToken || null,
      pushTokenPlatform: entry.data()?.pushTokenPlatform || null,
      pushPermissionState: entry.data()?.pushPermissionState || null,
      updatedAt: entry.data()?.updatedAt || null,
    }));
    if (!devices.length && profile?.pushToken) {
      devices.push({
        deviceId: profile?.pushTokenDeviceId || "legacy",
        pushToken: profile.pushToken,
        pushTokenPlatform: profile.pushTokenPlatform || null,
        pushPermissionState: profile.pushPermissionState || null,
        updatedAt: profile.pushTokenUpdatedAt || null,
      });
    }
    return res.json({
      success: true,
      profile: {
        pushToken: profile?.pushToken || null,
        pushTokenPlatform: profile?.pushTokenPlatform || null,
        pushPermissionState: profile?.pushPermissionState || null,
        pushTokenUpdatedAt: profile?.pushTokenUpdatedAt || null,
      },
      devices,
    });
  } catch (err) {
    console.error("❌ native-push status error:", err);
    return res.status(500).json({ error: "Failed to load native push status" });
  }
});

router.post("/settings/native-push/revoke", async (req, res) => {
  try {
    const uid = String(req?.user?.uid || "");
    const deviceId = String(req?.body?.deviceId || "").trim().replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 160);
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

    const userRef = db.collection("users").doc(uid);
    const profileSnap = await userRef.get();
    const profile = profileSnap.exists ? profileSnap.data() || {} : {};
    const writes = [userRef.collection("nativePushDevices").doc(deviceId).delete()];
    if (String(profile?.pushTokenDeviceId || "") === deviceId) {
      writes.push(userRef.set({
        pushToken: admin.firestore.FieldValue.delete(),
        pushTokenPlatform: admin.firestore.FieldValue.delete(),
        pushPermissionState: "revoked",
        pushTokenUpdatedAt: new Date().toISOString(),
        pushTokenDeviceId: admin.firestore.FieldValue.delete(),
      }, { merge: true }));
    }
    await Promise.all(writes);
    return res.json({ success: true, deviceId, revoked: true });
  } catch (err) {
    console.error("❌ native-push revoke error:", err);
    return res.status(500).json({ error: "Failed to revoke native push token" });
  }
});

router.post("/settings/native-push/test", async (req, res) => {
  try {
    const uid = String(req?.user?.uid || "");
    const { title, body } = req.body || {};
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const data = snap.exists ? snap.data() || {} : {};
    const deviceSnap = await userRef.collection("nativePushDevices").where("active", "==", true).get();
    const devices = deviceSnap.docs.map((entry) => ({
      deviceId: entry.id,
      token: String(entry.data()?.pushToken || "").trim(),
      platform: entry.data()?.pushTokenPlatform || "",
    })).filter((device) => device.token);
    if (!devices.length && data?.pushToken) {
      devices.push({
        deviceId: data?.pushTokenDeviceId || "legacy",
        token: String(data.pushToken).trim(),
        platform: data?.pushTokenPlatform || "",
      });
    }
    if (!devices.length) {
      return res
        .status(400)
        .json({ error: "No native push token registered for this account" });
    }

    const pushTitle = String(title || "PlanCraftAI push test").trim();
    const pushBody = String(
      body || "This is a remote push test from PlanCraftAI.",
    ).trim();
    const notificationSound = normalizeNotificationSound(
      data?.preferences?.notifications?.sound ||
        data?.preferences?.notifications?.notificationSound ||
        data?.preferences?.reminders?.sound,
    );
    const responses = await Promise.allSettled(devices.map((device) =>
      sendPushNotification(
        device.token,
        pushTitle,
        pushBody,
        {
          type: "native-push-test",
          platform: device.platform,
        },
        { sound: notificationSound },
      ),
    ));

    return res.json({
      success: responses.some((result) => result.status === "fulfilled"),
      devices: devices.length,
      responses: responses.map((result, index) => ({
        deviceId: devices[index].deviceId,
        ok: result.status === "fulfilled",
        response: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? result.reason?.message || "Push failed" : null,
      })),
    });
  } catch (err) {
    console.error("❌ native-push test error:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to send native push test" });
  }
});

router.post("/settings/profile", async (req, res) => {
  try {
    const { userId, profile } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!profile || typeof profile !== "object") {
      return res
        .status(400)
        .json({ error: "Missing or invalid profile payload" });
    }

    const patch = {
      updatedAt: new Date(),
    };

    if (profile.name !== undefined) {
      const value = String(profile.name || "").trim();
      patch.name = value || null;
    }

    if (profile.email !== undefined) {
      const value = String(profile.email || "").trim();
      patch.email = value || null;
    }

    if (profile.phone !== undefined) {
      const country = guessCountry(req);
      const normalized = profile.phone
        ? normalizePhone(String(profile.phone), country)
        : "";
      patch.phone = normalized || null;
    }

    if (profile.profileComplete !== undefined) {
      patch.profileComplete = !!profile.profileComplete;
    }

    await db
      .collection("users")
      .doc(String(userId))
      .set(patch, { merge: true });
    res.json({ success: true, profile: patch });
  } catch (err) {
    console.error("❌ updateProfile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /api/settings/:userId/reminder-preferences
router.get("/settings/:userId/reminder-preferences", async (req, res) => {
  try {
    const { userId } = req.params || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    const notifications = data?.preferences?.notifications || {};
    const rootNotifications = data?.notifications || {};
    const reminders = data?.preferences?.reminders || {};
    const sound = normalizeNotificationSound(
      notifications?.sound ||
        notifications?.notificationSound ||
        reminders?.sound,
    );

    const enabled =
      reminders?.enabled !== undefined
        ? !!reminders.enabled
        : !!notifications?.calls ||
          !!notifications?.whatsapp ||
          !!notifications?.push ||
          !!notifications?.pwa ||
          !!notifications?.email ||
          !!notifications?.sms ||
          !!rootNotifications?.whatsapp ||
          !!rootNotifications?.push ||
          !!rootNotifications?.pwa ||
          !!rootNotifications?.email ||
          !!rootNotifications?.sms ||
          !!rootNotifications?.voice_call;

    const channelsSource =
      Array.isArray(reminders?.channels) && reminders.channels.length
        ? reminders.channels
        : Array.isArray(notifications?.channels) &&
            notifications.channels.length
          ? notifications.channels
          : Array.isArray(rootNotifications?.channels) &&
              rootNotifications.channels.length
            ? rootNotifications.channels
            : [
                (notifications?.email ?? rootNotifications?.email) && "email",
                ((notifications?.push ?? rootNotifications?.push) ||
                  (notifications?.pwa ?? rootNotifications?.pwa)) &&
                  "pwa",
                (notifications?.whatsapp ?? rootNotifications?.whatsapp) &&
                  "whatsapp",
                (notifications?.sms ?? rootNotifications?.sms) && "sms",
                (notifications?.voice_call ?? rootNotifications?.voice_call) &&
                  "voice_call",
              ].filter(Boolean);

    const channels = Array.from(
      new Set(
        channelsSource
          .map((c) => String(c || "").toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c)),
      ),
    );

    res.json({
      enabled,
      channels,
      sound,
    });
  } catch (err) {
    console.error("❌ getReminderPreferences error:", err);
    res.status(500).json({ error: "Failed to fetch reminder preferences" });
  }
});

// export default at end of file after route registrations

// POST /api/settings/updateIntegrations
router.post("/settings/updateIntegrations", async (req, res) => {
  try {
    const { userId, integrations } = req.body || {};
    console.log("[Settings API] updateIntegrations body", {
      hasUserId: !!userId,
      keys:
        integrations && typeof integrations === "object"
          ? Object.keys(integrations)
          : null,
      whatsappPhone: integrations?.whatsapp?.phone
        ? String(integrations.whatsapp.phone).slice(0, 6) + "…"
        : null,
    });

    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!integrations || typeof integrations !== "object") {
      return res
        .status(400)
        .json({ error: "Missing or invalid integrations object" });
    }

    // Normalize + validate
    const toStr = (v) =>
      typeof v === "string" ? v : v == null ? "" : String(v);
    const trimUndef = (v) => toStr(v).trim() || undefined;
    const e164 = /^\+?[0-9]{8,15}$/;
    const errs = [];

    const userCountry = guessCountry(req);
    let wPhoneInput = trimUndef(integrations?.whatsapp?.phone);
    let sPhoneInput = trimUndef(integrations?.sms?.phone);
    const wPhoneNorm = wPhoneInput
      ? normalizePhone(wPhoneInput, userCountry)
      : undefined;
    const sPhoneNorm = sPhoneInput
      ? normalizePhone(sPhoneInput, userCountry)
      : undefined;
    const wPhone = wPhoneNorm;
    const sPhone = sPhoneNorm;
    if (wPhone && !e164.test(wPhone))
      errs.push("whatsapp.phone invalid; please enter a valid number");
    if (sPhone && !e164.test(sPhone))
      errs.push("sms.phone invalid; please enter a valid number");

    const dHook = trimUndef(integrations?.discord?.webhook);
    if (dHook && !/^https:\/\/discord\.com\/api\/webhooks\//.test(dHook))
      errs.push(
        "discord.webhook must start with https://discord.com/api/webhooks/",
      );

    if (errs.length)
      return res.status(400).json({ error: "Invalid fields", details: errs });

    // PWA subscriptions: array of { endpoint, keys: { p256dh, auth } }
    const pwaSubs = Array.isArray(integrations?.pwa?.subscriptions)
      ? integrations.pwa.subscriptions
          .map((s) => ({
            endpoint: trimUndef(s?.endpoint),
            keys:
              s?.keys && typeof s.keys === "object"
                ? {
                    p256dh: trimUndef(s.keys.p256dh),
                    auth: trimUndef(s.keys.auth),
                  }
                : undefined,
          }))
          .filter((s) => s.endpoint && s.keys?.p256dh && s.keys?.auth)
      : undefined;

    // Build object and prune undefined deeply to satisfy Firestore
    const safe = {
      whatsapp: { phone: wPhone },
      sms: { phone: sPhone },
      discord: { webhook: dHook },
      slack: {
        userId: trimUndef(integrations?.slack?.userId),
        token: trimUndef(integrations?.slack?.token),
      },
      email: trimUndef(integrations?.email),
      pwa: pwaSubs ? { subscriptions: pwaSubs } : undefined,
    };

    const pruneUndefinedDeep = (obj) => {
      if (obj == null) return obj;
      if (Array.isArray(obj)) {
        const arr = obj.map(pruneUndefinedDeep).filter((v) => v !== undefined);
        return arr;
      }
      if (typeof obj === "object") {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          const pv = pruneUndefinedDeep(v);
          if (pv === undefined) continue;
          if (
            typeof pv === "object" &&
            pv !== null &&
            !Array.isArray(pv) &&
            Object.keys(pv).length === 0
          )
            continue;
          out[k] = pv;
        }
        return out;
      }
      return obj;
    };

    // Mirror normalized phone contacts to the legacy notification preferences.
    const notifPhones = {
      phone_sms: sPhone || undefined,
      phone_voice:
        trimUndef(integrations?.voice?.phone) || sPhone || wPhone
          ? normalizePhone(
              trimUndef(integrations?.voice?.phone) || sPhone || wPhone,
              userCountry,
            )
          : undefined,
    };

    const payload = pruneUndefinedDeep({
      integrations: safe,
      preferences: { notifications: notifPhones },
      updatedAt: new Date(),
    });

    await db
      .collection("users")
      .doc(String(userId))
      .set(payload, { merge: true });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ updateIntegrations error:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to update integrations" });
  }
});

// GET /api/settings/integrations?userId=...
router.get("/settings/integrations", async (req, res) => {
  try {
    const { userId } = req.query || {};
    console.log("[Settings API] getIntegrations query", {
      hasUserId: !!userId,
    });
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    res.json({ integrations: data?.integrations || {} });
  } catch (err) {
    console.error("❌ getIntegrations error:", err);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.post("/settings/onboarding", async (req, res) => {
  try {
    const { userId, onboarding } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!onboarding || typeof onboarding !== "object") {
      return res.status(400).json({ error: "Missing onboarding payload" });
    }

    const payload = {};
    if (onboarding.completed !== undefined)
      payload.completed = !!onboarding.completed;
    if (onboarding.lastStep !== undefined) {
      const step = Number(onboarding.lastStep);
      payload.lastStep = Number.isFinite(step) ? step : 0;
    }
    if (onboarding.showLaterUntil !== undefined) {
      if (onboarding.showLaterUntil === null) payload.showLaterUntil = null;
      else {
        const parsed = parseDateInput(onboarding.showLaterUntil);
        if (parsed) payload.showLaterUntil = parsed;
      }
    }

    const dateFields = [
      "completedAt",
      "startedAt",
      "skippedAt",
      "lastDeferredAt",
      "replayRequestedAt",
    ];
    dateFields.forEach((field) => {
      if (onboarding[field] === undefined) return;
      if (onboarding[field] === null) {
        payload[field] = null;
      } else {
        const parsed = parseDateInput(onboarding[field]);
        if (parsed) payload[field] = parsed;
      }
    });

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: "No onboarding fields provided" });
    }

    payload.updatedAt = new Date();

    await db
      .collection("users")
      .doc(String(userId))
      .set(
        {
          preferences: {
            onboarding: payload,
          },
          updatedAt: new Date(),
        },
        { merge: true },
      );

    res.json({ success: true, onboarding: payload });
  } catch (err) {
    console.error("❌ onboarding status update error:", err);
    res.status(500).json({ error: "Failed to update onboarding status" });
  }
});

export default router;
