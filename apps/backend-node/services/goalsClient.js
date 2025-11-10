import fetch from "node-fetch";

const DEFAULT_BASE = "http://localhost:4502/api/goals";
const baseUrl = (process.env.GOALS_SERVICE_URL || DEFAULT_BASE).replace(/\/$/, "");

function buildUrl(path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Goals service error (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function createGoalViaService(payload = {}, options = {}) {
  const body = { ...payload };
  if (!body.userId && options.userId) body.userId = options.userId;
  if (!body.userId) throw new Error("createGoalViaService requires userId");
  const res = await fetch(buildUrl("/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseResponse(res);
  return data.goal;
}

export async function listGoalsViaService(userId, params = {}) {
  if (!userId) throw new Error("listGoalsViaService requires userId");
  const usp = new URLSearchParams({ userId, ...params });
  const res = await fetch(`${buildUrl("/list")}?${usp.toString()}`);
  const data = await parseResponse(res);
  return data.goals || [];
}

export async function updateGoalViaService(goalId, userId, payload = {}) {
  if (!goalId || !userId) throw new Error("updateGoalViaService requires goalId and userId");
  const res = await fetch(buildUrl(`/${goalId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ ...payload, userId }),
  });
  const data = await parseResponse(res);
  return data.goal;
}

export async function deleteGoalViaService(goalId, userId, options = {}) {
  if (!goalId || !userId) throw new Error("deleteGoalViaService requires goalId and userId");
  const url = new URL(buildUrl(`/${goalId}`));
  if (options.hardDelete) url.searchParams.set("hard", "1");
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ userId, hardDelete: options.hardDelete === true }),
  });
  return parseResponse(res);
}
