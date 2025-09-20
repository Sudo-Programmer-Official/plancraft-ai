// src/services/aiService.js
import axios from "axios";

// Normalize base URL (remove trailing slash if present)
const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/ai";
const API_BASE_URL = rawBase.replace(/\/+$/, "");

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20s safety timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Utility: safe response unwrap
function safeGet(res, key, fallback = null) {
  return res?.data?.[key] ?? fallback;
}

/**
 * ✨ Journal Enhancer
 */
export async function enhanceJournal(text) {
  try {
    const res = await api.post("/journal/enhance", { text });
    return safeGet(res, "enhanced", "");
  } catch (err) {
    console.error("❌ Journal Enhance API Error:", err?.response?.data || err.message);
    throw new Error("Failed to enhance journal entry. Please try again later.");
  }
}

/**
 * ✨ Task Summarizer
 */
export async function summarizeTasks(tasks) {
  try {
    const res = await api.post("/tasks/summarize", { tasks });

    // Normalize keys for frontend (camelCase)
    const summary = res.data?.summary || {};

    return {
      completedPct: summary["Completed %"] ?? summary.completedPct ?? 0,
      pending: summary["Pending items"] ?? summary.pending ?? 0,
      focus: summary["Suggested focus for today"] ?? summary.focus ?? "",
      quickWins: summary["Quick wins"] ?? summary.quickWins ?? [],
      heavyLifts: summary["Heavy lifts"] ?? summary.heavyLifts ?? [],
      weeklyWarning: summary["Weekly warning"] ?? summary.weeklyWarning ?? "",
    };
  } catch (err) {
    console.error("❌ Task Summarize API Error:", err?.response?.data || err.message);
    return {
      completedPct: 0,
      pending: 0,
      focus: "",
      quickWins: [],
      heavyLifts: [],
      weeklyWarning: "",
    };
  }
}

/**
 * ✨ Generate tasks from freeform text
 */
export async function generateTasksFromText(text) {
  try {
    const res = await api.post("/split-tasks", { text });
    return safeGet(res, "tasks", []);
  } catch (err) {
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}