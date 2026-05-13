import cron from "node-cron";
import { db } from "../services/firebaseAdmin.js";
import { getUserPrefs } from "../services/userPrefService.js";
import { deliverVoiceCoach } from "../services/voiceCoachService.js";
import { normalizeCronSpec } from "../utils/cronSpec.js";

const USERS_COLLECTION = "users";
const LOCK_COLLECTION = "job_locks";

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
  const stats = {
    sent: 0,
    skipped: {
      opted_out: 0,
      no_summary: 0,
      recent: 0,
      prefs: 0,
      other: 0,
    },
  };
  for (const user of users) {
    try {
      const prefs = await getUserPrefs(user.id);
      if (!prefs.enable_voice) {
        stats.skipped.opted_out += 1;
        continue;
      }
      const res = await deliverVoiceCoach(user.id, { verbose: false });
      if (res?.sent) {
        stats.sent += 1;
      } else if (res?.skipped) {
        if (stats.skipped.hasOwnProperty(res.skipped)) {
          stats.skipped[res.skipped] += 1;
        } else {
          stats.skipped.other += 1;
        }
      }
    } catch (err) {
      console.error("[VoiceCoach] delivery failed", { userId: user.id, error: err?.message || err });
    }
  }
  const totalSkipped = Object.values(stats.skipped).reduce((sum, value) => sum + value, 0);
  console.log("[VoiceCoach] morning coach finished", {
    sent: stats.sent,
    skipped: totalSkipped,
    breakdown: stats.skipped,
  });
  return { processed: stats.sent, skipped: stats.skipped };
}

async function acquireDailyRunLock() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const lockId = `voice_coach_${dateKey}`;
  const ref = db.collection(LOCK_COLLECTION).doc(lockId);
  const owner = process.env.HOSTNAME || process.pid || "local";
  let acquired = false;

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (snap.exists) return;
    txn.set(ref, {
      createdAt: new Date(),
      dateKey,
      owner: String(owner),
      job: "morning_coach",
    });
    acquired = true;
  });

  return { acquired, lockId, owner: String(owner) };
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
      const lock = await acquireDailyRunLock();
      if (!lock.acquired) {
        console.log("[VoiceCoach] skipped duplicate morning run (lock exists)");
        return;
      }
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
