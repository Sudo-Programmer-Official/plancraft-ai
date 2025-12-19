import { db } from "./firebaseAdmin.js";
import { WORKSPACE_BILLING_INTENTS_COLLECTION, WORKSPACE_PLANS } from "./workspaceService.js";

export async function createBillingIntent({ workspaceId, requestedPlan, seatCount = 3, createdBy }) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const plan = WORKSPACE_PLANS.includes(String(requestedPlan || "").toLowerCase())
    ? String(requestedPlan).toLowerCase()
    : "starter";
  const now = new Date();
  const ref = await db.collection(WORKSPACE_BILLING_INTENTS_COLLECTION).add({
    workspaceId,
    requestedPlan: plan,
    seatCount: Math.max(Number(seatCount) || 3, 3),
    status: "pending",
    createdBy: createdBy || null,
    created_at: now,
    updated_at: now,
  });
  const snap = await ref.get();
  return { id: ref.id, ...(snap.data() || {}) };
}
