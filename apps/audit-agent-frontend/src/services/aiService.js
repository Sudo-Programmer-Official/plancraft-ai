// src/services/aiService.js
// Use the shared API client so auth headers (Firebase/X-App-Token) are attached
import api from '@/services/api'

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
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post("/split-tasks", { text, timezone: tz });
    const raw = res?.data?.tasks ?? []
    const reminderTime = res?.data?.reminderTime ?? null
    // Normalize: accept array of strings or array of objects with title
    const tasks = Array.isArray(raw)
      ? raw.map((t) => (typeof t === 'string' ? t : (t?.title ?? ''))).filter(Boolean)
      : []
    return { tasks, reminderTime }
  } catch (err) {
    console.error("❌ Generate Tasks API Error:", err?.response?.data || err.message);
    throw new Error("Failed to generate tasks. Please try again later.");
  }
}

/**
 * ✨ Extract reminder time (ISO) from freeform text
 */
export async function extractReminderTime(text) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await api.post("/extract-time", { text, timezone: tz });
    const iso = res?.data?.reminderTime
    return typeof iso === 'string' && iso ? iso : null
  } catch (err) {
    console.error("❌ Extract Time API Error:", err?.response?.data || err.message);
    return null
  }
}
