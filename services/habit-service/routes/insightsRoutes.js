import express from "express";
import { monthlyInsights, regenerate, weeklyInsights, dryRun } from "../controllers/insightController.js";
import { requireUser } from "../utils/auth.js";

const router = express.Router();

router.get("/insights/weekly", requireUser, weeklyInsights);
router.get("/insights/monthly", requireUser, monthlyInsights);
router.post("/insights/regenerate", requireUser, regenerate);
router.get("/insights/dry-run", requireUser, dryRun);

export default router;
