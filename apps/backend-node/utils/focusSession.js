const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
const ALLOWED_OUTCOMES = new Set(["completed_task", "break", "continued", "ended"]);

// Validates and normalizes a finished focus session payload.
// Returns { session } on success or { error } when the payload is unusable.
export function normalizeFocusSession(body = {}) {
  const taskId = String(body.taskId || "").trim();
  if (!taskId) return { error: "Missing taskId" };

  const startedAt = new Date(body.startedAt);
  const endedAt = new Date(body.endedAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return { error: "Invalid startedAt/endedAt" };
  }
  if (endedAt < startedAt) return { error: "endedAt is before startedAt" };

  const focusedMs = Math.round(Number(body.focusedMs));
  if (!Number.isFinite(focusedMs) || focusedMs < 0) return { error: "Invalid focusedMs" };
  const wallMs = endedAt.getTime() - startedAt.getTime();
  if (focusedMs > wallMs + 5000 || focusedMs > MAX_SESSION_MS) {
    return { error: "focusedMs exceeds session length" };
  }

  const planned = body.plannedMinutes == null ? null : Number(body.plannedMinutes);
  const plannedMinutes = Number.isFinite(planned) && planned > 0 ? Math.min(Math.round(planned), 240) : null;
  const outcome = ALLOWED_OUTCOMES.has(body.outcome) ? body.outcome : "ended";

  return {
    session: {
      taskId,
      taskTitle: String(body.taskTitle || "").slice(0, 300),
      plannedMinutes,
      focusedMs: Math.min(focusedMs, wallMs),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      outcome,
    },
  };
}
