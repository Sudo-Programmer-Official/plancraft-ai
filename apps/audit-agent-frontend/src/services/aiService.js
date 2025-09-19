// src/services/aiService.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/ai";

// Journal Enhancer
export async function enhanceJournal(text) {
  try {
    const res = await axios.post(`${API_BASE_URL}/journal/enhance`, { text });
    return res.data.enhanced;
  } catch (err) {
    console.error("❌ Journal Enhance API Error:", err);
    throw err;
  }
}

// Task Summarizer
export async function summarizeTasks(tasks) {
  try {
    const res = await axios.post(`${API_BASE_URL}/tasks/summarize`, { tasks });
    return res.data.summary;
  } catch (err) {
    console.error("❌ Task Summarize API Error:", err);
    throw err;
  }
}