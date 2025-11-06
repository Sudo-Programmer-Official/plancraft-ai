import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { db } from "./firebaseAdmin.js";
import { generateVoice } from "./ttsService.js";
import { sendNotification } from "./notificationService.js";
import { makeCallForUser } from "./twilioService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const SUMMARY_COLLECTION = "habit_summary";
const USERS_COLLECTION = "users";

const MIN_INTERVAL_HOURS = Number(process.env.VOICE_COACH_MIN_INTERVAL_HOURS || 18);

function toneFromStrength(strength = 0) {
  const value = Number(strength);
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

function resolveVoicePreset(tone) {
  const map = {
    high: process.env.VOICE_COACH_VOICE_HIGH || process.env.TTS_VOICE_HIGH || "alloy",
    medium: process.env.VOICE_COACH_VOICE_MEDIUM || process.env.TTS_VOICE_MEDIUM || "verse",
    low: process.env.VOICE_COACH_VOICE_LOW || process.env.TTS_VOICE_LOW || "echo",
  };
  return map[tone] || map.low;
}

async function loadHabitSummary(userId) {
  const snap = await db.collection(SUMMARY_COLLECTION).doc(String(userId)).get();
  return snap.exists ? snap.data() || {} : null;
}

async function loadUserProfile(userId) {
  const snap = await db.collection(USERS_COLLECTION).doc(String(userId)).get();
  if (!snap.exists) return {};
  const data = snap.data() || {};
  return {
    name: data.displayName || data.name || data.fullName || null,
    email: data.email || null,
    timezone: data.timezone || data.tz || data.preferences?.timezone || null,
    preferences: data.preferences || {},
  };
}

function buildCoachText(summary, profile = {}) {
  const strength = Number(summary?.habit_strength || 0);
  const streak = summary?.current_streak || 0;
  const consistency = summary?.consistency_score || 0;
  const tone = toneFromStrength(strength);
  const name = (profile.name || "").split(" ")[0] || "friend";

  if (tone === "high") {
    return {
      tone,
      headline: "Momentum Master!",
      message: `🔥 ${name}, you’ve crushed the last week! Your streak is at ${streak} days and consistency is ${(consistency * 100).toFixed(0)}%. Keep the momentum going!`,
    };
  }
  if (tone === "medium") {
    return {
      tone,
      headline: "Keep Building",
      message: `👍 ${name}, you're on a solid streak. You hit ${(consistency * 100).toFixed(0)}% of your plan. Let’s push for one more win today.`,
    };
  }
  return {
    tone,
    headline: "Fresh Start",
    message: `💪 ${name}, every day is a new chance. Pick one small win today and I’ll be right here to celebrate with you.`,
  };
}

function shouldSend(summary) {
  if (!summary) return true;
  const last = summary.last_coach_at || summary.last_voice_sent_at || summary.last_spoken || null;
  if (!last) return true;
  try {
    const lastMoment = dayjs(last);
    if (!lastMoment.isValid()) return true;
    return dayjs().diff(lastMoment, "hour") >= MIN_INTERVAL_HOURS;
  } catch {
    return true;
  }
}

function userAllowsVoice(profile = {}) {
  try {
    const prefs = profile.preferences?.notifications || {};
    if (prefs.enable_voice === false) return false;
    return prefs.enable_voice !== false;
  } catch {
    return true;
  }
}

export async function getVoiceCoachMessage(userId) {
  const summary = await loadHabitSummary(userId);
  if (!summary) return null;
  const profile = await loadUserProfile(userId);
  const text = buildCoachText(summary, profile);
  return {
    ...text,
    strength: summary.habit_strength || 0,
    streak: summary.current_streak || 0,
    consistency: summary.consistency_score || 0,
    avgCompletion: summary.avg_completion_time || null,
    lastAnalyzed: summary.last_analyzed || null,
    lastCoach: summary.last_coach_at || summary.last_voice_sent_at || null,
    audioUrl: summary.last_coach_audio_url || null,
  };
}

export async function deliverVoiceCoach(userId, options = {}) {
  if (!userId) return { skipped: "missing_user" };
  if (String(process.env.ENABLE_VOICE_COACH || "").trim().toLowerCase() !== "true") {
    return { skipped: "flag_off" };
  }

  const [summary, profile] = await Promise.all([
    loadHabitSummary(userId),
    loadUserProfile(userId),
  ]);

  if (!summary) {
    console.log("[VoiceCoach] skipped (no summary)", { userId });
    return { skipped: "no_summary" };
  }

  if (!shouldSend(summary) && options.force !== true) {
    console.log("[VoiceCoach] skipped (recently sent)", { userId });
    return { skipped: "recent" };
  }

  if (!userAllowsVoice(profile) && options.force !== true) {
    console.log("[VoiceCoach] skipped (user disabled voice)", { userId });
    return { skipped: "prefs" };
  }

  const coach = buildCoachText(summary, profile);
  const voice = resolveVoicePreset(coach.tone);
  const message = coach.message;

  let audioUrl = null;
  try {
    const tts = await generateVoice(message, { voice });
    audioUrl = tts?.url || null;
  } catch (err) {
    console.warn("[VoiceCoach] generateVoice failed", err?.message || err);
  }

  const channels = options.channels || { voice: true, whatsapp: true };
  if (channels.voice !== false) {
    try {
      await makeCallForUser(userId, message, { userId, source: "voice_coach", bypassChecks: true });
      console.log("[VoiceCoach] voice call queued", { userId });
    } catch (err) {
      console.error("[VoiceCoach] voice call failed", err?.message || err);
    }
  }

  if (channels.whatsapp !== false) {
    try {
      await sendNotification(userId, message, ["whatsapp"], {
        whatsapp: { message },
        whatsappFallback: message,
      });
    } catch (err) {
      console.warn("[VoiceCoach] whatsapp send failed", err?.message || err);
    }
  }

  const nowIso = new Date().toISOString();
  try {
    await db.collection(SUMMARY_COLLECTION).doc(String(userId)).set(
      {
        last_coach_at: nowIso,
        last_voice_sent_at: nowIso,
        last_coach_audio_url: audioUrl || null,
        last_coach_tone: coach.tone,
        last_coach_message: message,
        updated_at: nowIso,
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[VoiceCoach] summary update failed", err?.message || err);
  }

  return {
    sent: true,
    tone: coach.tone,
    voice,
    audioUrl,
    message,
  };
}

export default {
  getVoiceCoachMessage,
  deliverVoiceCoach,
};
