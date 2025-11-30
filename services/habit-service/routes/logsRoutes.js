import express from "express";
import { createLog, listLogs } from "../controllers/habitLogController.js";
import { requireUser } from "../utils/auth.js";

const router = express.Router();

router.post("/:id/log", requireUser, createLog);
router.get("/logs", requireUser, listLogs);

export default router;
