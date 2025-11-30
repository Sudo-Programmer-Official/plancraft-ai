import express from "express";
import { sendCoachMessage } from "../controllers/coachController.js";
import { requireUser } from "../utils/auth.js";

const router = express.Router();

router.post("/coach/message", requireUser, sendCoachMessage);

export default router;
