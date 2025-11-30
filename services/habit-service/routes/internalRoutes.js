import express from "express";
import { taskCompleted } from "../controllers/internalController.js";
import { requireServiceToken } from "../utils/auth.js";

const router = express.Router();

router.post("/task-completed", requireServiceToken, taskCompleted);

export default router;
