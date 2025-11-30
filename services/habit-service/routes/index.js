import express from "express";
import habitsRoutes from "./habitsRoutes.js";
import logsRoutes from "./logsRoutes.js";
import insightsRoutes from "./insightsRoutes.js";
import coachRoutes from "./coachRoutes.js";
import internalRoutes from "./internalRoutes.js";

const router = express.Router();

router.use("/", habitsRoutes);
router.use("/", logsRoutes);
router.use("/", insightsRoutes);
router.use("/", coachRoutes);
router.use("/internal", internalRoutes);

export default router;
