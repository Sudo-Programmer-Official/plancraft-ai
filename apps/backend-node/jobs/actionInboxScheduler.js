import cron from "node-cron";
import { normalizeCronSpec } from "../utils/cronSpec.js";
import { runGlobalActionInboxDigest, runGlobalActionInboxSweep } from "../services/actionInboxService.js";

function isEnabled() {
  const raw = String(process.env.ENABLE_ACTION_INBOX_SWEEPS || "1").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function cronSpec() {
  return normalizeCronSpec(process.env.ACTION_INBOX_SWEEP_CRON, "5 * * * *");
}

export async function runActionInboxSweepOnce() {
  const sweep = await runGlobalActionInboxSweep({ trigger: "scheduled_sweep" });
  const digest = await runGlobalActionInboxDigest({ trigger: "scheduled_digest" });
  const result = { sweep, digest };
  console.log("[ActionInbox] scheduled sweep complete", JSON.stringify(result));
  return result;
}

export function initActionInboxScheduler() {
  if (!isEnabled()) {
    console.log("[ActionInbox] scheduler disabled (set ENABLE_ACTION_INBOX_SWEEPS=1 to enable)");
    return;
  }

  const spec = cronSpec();
  console.log(`[ActionInbox] scheduler enabled (spec=${spec})`);
  cron.schedule(spec, async () => {
    try {
      await runActionInboxSweepOnce();
    } catch (err) {
      console.error("[ActionInbox] sweep failed", err?.message || err);
    }
  });
}

export default {
  initActionInboxScheduler,
  runActionInboxSweepOnce,
};
