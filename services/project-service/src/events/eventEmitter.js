import { dispatchEvent } from "./eventSink.js";

function nowIso() {
  return new Date().toISOString();
}

function toActor(payload = {}) {
  if (!payload.actorUserId) return null;
  return {
    userId: payload.actorUserId,
    displayName: payload.actorDisplayName || null,
  };
}

function toEntity(payload = {}) {
  if (!payload.entityType || !payload.entityId) return null;
  return {
    type: payload.entityType,
    id: payload.entityId,
  };
}

export function emitEvent(type, payload = {}) {
  if (!type) return;
  const event = {
    type,
    workspaceId: payload.workspaceId || null,
    projectId: payload.projectId || null,
    actorUserId: payload.actorUserId || null,
    actor: toActor(payload),
    entity: toEntity(payload),
    timestamp: payload.timestamp || nowIso(),
    data: payload.data || {},
  };
  dispatchEvent(event);
  return event;
}
