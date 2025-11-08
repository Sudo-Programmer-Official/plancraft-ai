import cron from "node-cron";
import { db } from "../services/firebaseAdmin.js";
import { getUserPrefs } from "../services/userPrefService.js";
import { deliverVoiceCoach } from "../services/voiceCoachService.js";
import { normalizeCronSpec } from "../utils/cronSpec.js";

const USERS_COLLECTION = "users";

function isEnabled() {
  const raw = String(process.env.ENABLE_VOICE_COACH || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function cronSpec() {
  return normalizeCronSpec(process.env.MORNING_COACH_CRON, "0 14 * * *"); // default 14:00 UTC (~9am ET)
}

async function fetchUsers() {
  const snap = await db.collection(USERS_COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

async function runOnce() {
  if (!isEnabled()) {
    console.log("[VoiceCoach] skipped (flag off)");
    return { processed: 0, skipped: "flag_off" };
  }

  const users = await fetchUsers();
  console.log(`[VoiceCoach] morning run for ${users.length} users`);
  let processed = 0;
  for (const user of users) {
    try {
      const prefs = await getUserPrefs(user.id);
      if (!prefs.enable_voice) {
        console.log("[VoiceCoach] user opted out", { userId: user.id });
        continue;
      }
      await deliverVoiceCoach(user.id);
      processed += 1;
    } catch (err) {
      console.error("[VoiceCoach] delivery failed", { userId: user.id, error: err?.message || err });
    }
  }
  console.log(`[VoiceCoach] morning coach finished (sent=${processed})`);
  return { processed };
}

export function initMorningCoach() {
  if (!isEnabled()) {
    console.log("[VoiceCoach] scheduler disabled (set ENABLE_VOICE_COACH=1 to enable)");
    return;
  }

  const spec = cronSpec();
  console.log(`[VoiceCoach] scheduler enabled (spec=${spec})`);
  cron.schedule(spec, async () => {
    try {
      console.log("[VoiceCoach] cron triggered", new Date().toISOString());
      await runOnce();
    } catch (err) {
      console.error("[VoiceCoach] cron error", err?.message || err);
    }
  });
}

export default {
  initMorningCoach,
  runOnce,
};
