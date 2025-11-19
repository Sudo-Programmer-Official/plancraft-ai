import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import {
  buildOutlookConsentUrl,
  exchangeOutlookCodeForTokens,
  saveUserOutlookTokens,
  parseOutlookState,
  getUserOutlookIntegration,
  ensureFreshOutlookToken,
  disconnectOutlookIntegration,
} from "../services/outlookOAuth.js";
import { syncOutlookAccount } from "../services/calendarSyncService.js";

const router = express.Router();
const ENABLED = String(process.env.ENABLE_OUTLOOK_CALENDAR || "").toLowerCase();

function assertEnabled(res) {
  if (ENABLED !== "1" && ENABLED !== "true") {
    res.status(503).json({ error: "Outlook integration disabled by server config" });
    return false;
  }
  return true;
}

router.get("/outlook/connect", requireAuth, ensureUserMatches, async (req, res) => {
  try {
    if (!assertEnabled(res)) return;
    const userId = req.query.userId || req?.user?.uid;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const url = await buildOutlookConsentUrl(String(userId));
    const accept = String(req.headers["accept"] || "");
    if (/json/.test(accept)) return res.json({ url });
    return res.redirect(url);
  } catch (e) {
    console.error("GET /outlook/connect failed", e?.message || e);
    return res.status(500).json({ error: "Internal error" });
  }
});

router.get("/outlook/oauth/callback", async (req, res) => {
  try {
    if (ENABLED !== "1" && ENABLED !== "true") {
      return res.status(503).send("Outlook integration disabled");
    }
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const errParam = String(req.query.error || "");
    const successUrl =
      process.env.OUTLOOK_CONNECT_REDIRECT_SUCCESS ||
      process.env.APP_SUCCESS_URL ||
      "https://plancraftai.com/settings?outlook=connected";
    const failUrlBase =
      process.env.OUTLOOK_CONNECT_REDIRECT_FAILURE ||
      process.env.APP_FAILURE_URL ||
      "https://plancraftai.com/settings?outlook=error";
    const redirectFail = (reason) => {
      const join = failUrlBase.includes("?") ? "&" : "?";
      return res.redirect(`${failUrlBase}${join}reason=${encodeURIComponent(reason || "unknown")}`);
    };
    if (errParam) return redirectFail(errParam || "access_denied");
    if (!code || !state) return redirectFail("missing_params");
    const parsed = await parseOutlookState(state);
    if (!parsed?.userId) return redirectFail("invalid_state");
    const tokens = await exchangeOutlookCodeForTokens(code);
    await saveUserOutlookTokens(parsed.userId, tokens);
    // Prime ensure call (non fatal)
    try {
      await ensureFreshOutlookToken(parsed.userId);
    } catch {}
    return res.redirect(successUrl);
  } catch (e) {
    console.error("GET /outlook/oauth/callback error", e?.message || e);
    const fail =
      process.env.OUTLOOK_CONNECT_REDIRECT_FAILURE ||
      process.env.APP_FAILURE_URL ||
      "https://plancraftai.com/settings?outlook=error";
    const join = fail.includes("?") ? "&" : "?";
    try {
      return res.redirect(`${fail}${join}reason=${encodeURIComponent("exchange_failed")}`);
    } catch {}
    return res.status(500).send("Failed to connect Outlook");
  }
});

router.get("/outlook/status", requireAuth, ensureUserMatches, async (req, res) => {
  try {
    if (!assertEnabled(res)) return;
    const userId = req.query.userId || req?.user?.uid;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const integration = (await getUserOutlookIntegration(String(userId))) || {};
    return res.json({ integration });
  } catch (e) {
    console.error("GET /outlook/status failed", e?.message || e);
    return res.status(500).json({ error: "Internal error" });
  }
});

router.post("/outlook/sync/now", requireAuth, ensureUserMatches, async (req, res) => {
  try {
    if (!assertEnabled(res)) return;
    const userId = req.body.userId || req?.user?.uid;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const stats = await syncOutlookAccount(String(userId));
    return res.json({ ok: true, stats });
  } catch (e) {
    console.error("POST /outlook/sync/now failed", e?.message || e);
    return res.status(500).json({ error: e?.message || "Sync failed" });
  }
});

router.delete("/outlook/disconnect", requireAuth, ensureUserMatches, async (req, res) => {
  try {
    if (!assertEnabled(res)) return;
    const userId = req.body.userId || req?.user?.uid;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    await disconnectOutlookIntegration(String(userId));
    return res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /outlook/disconnect failed", e?.message || e);
    return res.status(500).json({ error: "Failed to disconnect Outlook" });
  }
});

export default router;
