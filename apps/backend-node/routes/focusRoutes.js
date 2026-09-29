import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { db } from "../services/firebaseAdmin.js";
import { normalizeFocusSession } from "../utils/focusSession.js";

const router = express.Router();

router.use(requireAuth, ensureUserMatches);

router.post("/sessions", async (req, res) => {
  try {
    const userId = String(req.user?.uid || "");
    const { session, error } = normalizeFocusSession(req.body || {});
    if (error) return res.status(400).json({ error });

    const taskSnap = await db.collection("tasks").doc(session.taskId).get();
    if (!taskSnap.exists) return res.status(404).json({ error: "Task not found" });
    const task = taskSnap.data() || {};
    if (String(task.userId || "") !== userId) {
      return res.status(403).json({ error: "Forbidden: task does not belong to user" });
    }

    const doc = {
      ...session,
      userId,
      workspaceId: task.workspaceId || null,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection("focus_sessions").add(doc);
    return res.json({ ok: true, session: { id: ref.id, ...doc } });
  } catch (err) {
    console.error("[FocusRoutes] save session failed", err?.message || err);
    return res.status(500).json({ error: "Failed to save focus session" });
  }
});

export default router;
