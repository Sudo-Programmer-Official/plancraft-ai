import express from "express";
import requireAdmin from "../middleware/requireAdmin.js";
import { db } from "../services/firebaseAdmin.js";
import { DEFAULT_TRIGGERS } from "../services/retention/defaults.js";
import {
  runRetentionSweep,
  listRetentionStats,
} from "../services/retention/triggerEngine.js";
import { listTemplates, saveTemplate } from "../services/retention/templates.js";

const router = express.Router();
router.use(requireAdmin);

router.get("/triggers", async (_req, res) => {
  try {
    const snap = await db.collection("retention_triggers").get();
    const stored = new Map();
    snap.forEach((doc) => stored.set(doc.id, { key: doc.id, ...(doc.data() || {}) }));

    const triggers = DEFAULT_TRIGGERS.map((t) => {
      const override = stored.get(t.key) || {};
      return {
        ...t,
        ...override,
        enabled: override.enabled !== undefined ? override.enabled : true,
      };
    });
    return res.json({ triggers });
  } catch (err) {
    console.error("Failed to load triggers", err);
    return res.status(500).json({ error: "Failed to load triggers" });
  }
});

router.post("/triggers/:key", async (req, res) => {
  const key = String(req.params.key || "");
  if (!key) return res.status(400).json({ error: "Missing trigger key" });
  const payload = req.body || {};
  try {
    await db.collection("retention_triggers").doc(key).set(
      {
        enabled: payload.enabled !== undefined ? !!payload.enabled : true,
        delayHours:
          payload.delayHours !== undefined ? Number(payload.delayHours) : undefined,
        cooldownHours:
          payload.cooldownHours !== undefined ? Number(payload.cooldownHours) : undefined,
        templateKey: payload.templateKey || payload.template_key,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    const doc = await db.collection("retention_triggers").doc(key).get();
    return res.json({ trigger: { key, ...(doc.data() || {}) } });
  } catch (err) {
    console.error("Failed to update trigger", err);
    return res.status(500).json({ error: "Failed to update trigger" });
  }
});

router.get("/templates", async (_req, res) => {
  try {
    const templates = await listTemplates();
    return res.json({ templates });
  } catch (err) {
    console.error("Failed to load templates", err);
    return res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates/:key", async (req, res) => {
  try {
    const key = String(req.params.key || "");
    if (!key) return res.status(400).json({ error: "Missing template key" });
    const tpl = await saveTemplate(key, req.body || {});
    return res.json({ template: tpl });
  } catch (err) {
    console.error("Failed to save template", err);
    return res.status(500).json({ error: "Failed to save template" });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const stats = await listRetentionStats();
    return res.json({ stats });
  } catch (err) {
    console.error("Failed to load retention stats", err);
    return res.status(500).json({ error: "Failed to load stats" });
  }
});

router.post("/run", async (req, res) => {
  try {
    const limit = Number(req.body?.limit || 20);
    const result = await runRetentionSweep({ limit });
    return res.json({ result });
  } catch (err) {
    console.error("Failed to run retention sweep", err);
    return res.status(500).json({ error: "Failed to run retention sweep" });
  }
});

export default router;
