import cron from "node-cron";
import { normalizeCronSpec } from "../utils/cronSpec.js";
import { runRetentionSweep } from "../services/retention/triggerEngine.js";

function isEnabled() {
  const raw = String(process.env.ENABLE_RETENTION || process.env.RETENTION_ENABLED || "").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function cronSpec() {
  return normalizeCronSpec(process.env.RETENTION_CRON, "*/20 * * * *");
}

export function initRetentionJob() {
  if (!isEnabled()) {
    console.log("[Retention] scheduler disabled (set ENABLE_RETENTION=1 to enable)");
    return;
  }

  const spec = cronSpec();
  console.log(`[Retention] scheduler enabled (spec=${spec})`);
  cron.schedule(spec, async () => {
    try {
      const result = await runRetentionSweep();
      console.log(
        "[Retention] sweep complete",
        JSON.stringify({ scanned: result.scanned, fired: result.fired })
      );
    } catch (err) {
      console.error("[Retention] sweep failed", err?.message || err);
    }
  });
}

export default {
  initRetentionJob,
};
