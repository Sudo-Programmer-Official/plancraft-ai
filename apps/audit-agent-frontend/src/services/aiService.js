// src/services/aiService.js
import axios from "axios";

// Normalize base URL (remove trailing slash if present)
const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/ai";
const API_BASE_URL = rawBase.replace(/\/+$/, "");

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 40000, // 20s safety timeout
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
    const raw = res?.data?.tasks ?? []
    // Normalize: accept array of strings or array of objects with title
    const tasks = Array.isArray(raw)
      ? raw.map((t) => (typeof t === 'string' ? t : (t?.title ?? ''))).filter(Boolean)
      : []
    return tasks
  } catch (err) {
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}

/** ✨ Summarize journal focus */
/** ✨ Summarize journal focus */
// export async function summarizeJournalFocus(entries) {
//   try {
//     const res = await api.post("/journal/summarize-focus", { entries });
//     return safeGet(res, "focus", "");
//   } catch (err) {
//     console.error("❌ Journal Focus API Error:", err?.response?.data || err.message);
//     throw new Error("Failed to summarize journal focus. Please try again later.");
//   }
// }
export async function summarizeJournalFocus(entries) {
  try {
    const res = await api.post("/journal/summarize-focus", { entries });
    return safeGet(res, "focus", "");
  } catch (err) {
    const status = err?.response?.status;
    const body = err?.response?.data || err.message;
    if (status === 404) {
      // Backend not deployed with this route yet — fail soft with empty focus
      console.warn("⚠ Journal Focus endpoint missing (404). Returning empty focus.");
      return "";
    }
    console.error("❌ Journal Focus API Error:", body);
    throw new Error("Failed to summarize journal focus. Please try again later.");
  }
}
