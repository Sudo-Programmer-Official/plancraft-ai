export const TASK_CATEGORY_KEYS = [
  "Work",
  "Health",
  "Learning",
  "Personal",
  "Finance",
  "Routine",
  "Other",
  "Uncategorized",
]

export const TASK_CATEGORY_FILTERS = ["All", ...TASK_CATEGORY_KEYS]

export const TASK_CATEGORY_ICONS = {
  All: "🌈",
  Work: "💼",
  Health: "🏃",
  Learning: "📚",
  Personal: "💖",
  Finance: "💰",
  Routine: "⏰",
  Other: "✨",
  Uncategorized: "🌀",
}

export const TASK_CATEGORY_COLORS = {
  All: "text-slate-200",
  Work: "text-indigo-300",
  Health: "text-emerald-300",
  Learning: "text-sky-300",
  Personal: "text-pink-300",
  Finance: "text-amber-300",
  Routine: "text-gray-300",
  Other: "text-slate-300",
  Uncategorized: "text-slate-400",
}

export function resolveCategory(value) {
  if (typeof value !== "string") return "Uncategorized"
  const trimmed = value.trim()
  if (!trimmed) return "Uncategorized"
  if (TASK_CATEGORY_KEYS.includes(trimmed)) return trimmed
  return "Other"
}

export function getCategoryIcon(value) {
  const key = value === "All" ? "All" : resolveCategory(value)
  return TASK_CATEGORY_ICONS[key] || "✨"
}

export function getCategoryColor(value) {
  const key = value === "All" ? "All" : resolveCategory(value)
  return TASK_CATEGORY_COLORS[key] || TASK_CATEGORY_COLORS.Other
}
