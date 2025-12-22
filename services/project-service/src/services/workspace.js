import { firestore } from "./firebase.js";

const MEMBERS_COLLECTION = "workspace_members";

export async function getWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId || !userId) return null;
  try {
    const key = `${workspaceId}_${userId}`;
    const snap = await firestore().collection(MEMBERS_COLLECTION).doc(key).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return {
      workspaceId: data.workspaceId || workspaceId,
      userId: data.userId || userId,
      role: String(data.role || "").toLowerCase() || "viewer",
      status: data.status || "active",
    };
  } catch (err) {
    console.warn("[project-service] membership lookup failed", err?.message || err);
    return null;
  }
}
