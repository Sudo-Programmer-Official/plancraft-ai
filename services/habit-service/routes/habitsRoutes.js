import express from "express";
import { listHabits, createHabit, updateHabit, deleteHabit } from "../controllers/habitController.js";
import { requireUser } from "../utils/auth.js";

const router = express.Router();

router.get("/", requireUser, listHabits);
router.post("/", requireUser, createHabit);
router.put("/:id", requireUser, updateHabit);
router.delete("/:id", requireUser, deleteHabit);

export default router;
