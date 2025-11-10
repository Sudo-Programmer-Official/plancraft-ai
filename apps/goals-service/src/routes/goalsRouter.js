import express from "express";
import {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  summarizeGoals,
  recordGoalReflection,
  listGoalReflections,
} from "../services/goalService.js";
import { suggestMilestones } from "../services/milestoneGenerator.js";

const router = express.Router();

function resolveUserId(req) {
  return (
    req.body?.userId ||
    req.query?.userId ||
    req.headers["x-user-id"] ||
    req.headers["x-user"] ||
    null
  );
}

router.post("/create", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const shouldAutoPlan =
      typeof req.body?.useAiMilestones === "boolean"
        ? req.body.useAiMilestones
        : req.body?.autoPlan !== false;
    const goal = await createGoal(
      { ...req.body, userId },
      {
        autoPlan: shouldAutoPlan,
        generateTasks: req.body?.generateTasksForMilestones,
        source: req.body?.source,
        voiceContext: req.body?.voiceContext,
      },
    );
    return res.json({ goal });
  } catch (err) {
    console.error("[GoalsRouter] create failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to create goal" });
  }
});

router.get("/list", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const goals = await listGoals(userId, {
      status: req.query?.status,
      category: req.query?.category,
      after: req.query?.after,
    });
    return res.json({ goals });
  } catch (err) {
    console.error("[GoalsRouter] list failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to list goals" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const summary = await summarizeGoals(userId);
    return res.json({ summary });
  } catch (err) {
    console.error("[GoalsRouter] summary failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to build summary" });
  }
});

router.post("/milestones/suggest", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const suggestions = await suggestMilestones({
      title: req.body?.title,
      description: req.body?.description,
      category: req.body?.category,
      targetDate: req.body?.targetDate,
      timeframe: req.body?.timeframe,
    });
    return res.json({ suggestions });
  } catch (err) {
    console.error("[GoalsRouter] suggest failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to generate milestones" });
  }
});

router.post("/reflect", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const reflection = await recordGoalReflection(userId, req.body || {});
    return res.json({ reflection });
  } catch (err) {
    console.error("[GoalsRouter] reflect create failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to save reflection" });
  }
});

router.get("/reflect", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const reflections = await listGoalReflections(userId, {
      limit: Number(req.query?.limit) || 10,
      goalId: req.query?.goalId,
    });
    return res.json({ reflections });
  } catch (err) {
    console.error("[GoalsRouter] reflect list failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to load reflections" });
  }
});

router.get("/:goalId", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const goal = await getGoal(req.params.goalId, userId);
    return res.json({ goal });
  } catch (err) {
    console.error("[GoalsRouter] get failed", err?.message || err);
    const status = err?.status || (err?.message === "Goal not found" ? 404 : 500);
    return res.status(status).json({ error: err?.message || "Failed to fetch goal" });
  }
});

router.patch("/:goalId", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const goal = await updateGoal(
      req.params.goalId,
      userId,
      req.body || {},
      { generateTasks: req.body?.generateTasksForMilestones },
    );
    return res.json({ goal });
  } catch (err) {
    console.error("[GoalsRouter] update failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to update goal" });
  }
});

router.delete("/:goalId", async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const result = await deleteGoal(req.params.goalId, userId, {
      hardDelete: req.query?.hard === "1" || req.body?.hardDelete === true,
    });
    return res.json(result);
  } catch (err) {
    console.error("[GoalsRouter] delete failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to delete goal" });
  }
});

export default router;
