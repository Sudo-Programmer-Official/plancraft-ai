import crypto from "crypto";
import { db } from "../firebaseAdmin.js";

export const NODE_TYPES = ["doc", "chunk", "task", "requirement"];
export const EDGE_TYPES = ["derived_from", "implements"];

function now() {
  return new Date();
}

function buildNodeId(type, refId) {
  if (!type || !refId) return null;
  const cleanRef = String(refId);
  if (type === "doc") return cleanRef;
  if (type === "chunk") return `chunk_${cleanRef}`;
  if (type === "task") return `task_${cleanRef}`;
  if (type === "requirement") return `req_${cleanRef}`;
  return null;
}

function hashId(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex").slice(0, 32);
}

function buildEdgeId({ workspaceId, fromNodeId, toNodeId, relationType }) {
  return `edge_${hashId(`${workspaceId}|${fromNodeId}|${toNodeId}|${relationType}`)}`;
}

export async function upsertNode({ workspaceId, type, refId, label, createdBy, sourceDocId, sourceType, metadata = {} }) {
  if (!workspaceId || !type || !refId) return null;
  const normalizedType = String(type).toLowerCase();
  if (!NODE_TYPES.includes(normalizedType)) return null;
  const nodeId = buildNodeId(normalizedType, refId);
  if (!nodeId) return null;

  const data = {
    workspaceId,
    type: normalizedType,
    refId,
    label: label || null,
    sourceDocId: sourceDocId || null,
    sourceType: sourceType || null,
    createdBy: createdBy || null,
    metadata: metadata || {},
    updatedAt: now(),
  };
  await db
    .collection("workspace_knowledge_nodes")
    .doc(nodeId)
    .set(
      {
        ...data,
        createdAt: now(),
      },
      { merge: true },
    );
  return { id: nodeId, ...data };
}

export async function ensureDocNode({ workspaceId, docId, title, source }) {
  return upsertNode({
    workspaceId,
    type: "doc",
    refId: docId,
    label: title || "Document",
    sourceType: source || "doc",
  });
}

export async function ensureChunkNode({ workspaceId, chunkId, docId, heading }) {
  return upsertNode({
    workspaceId,
    type: "chunk",
    refId: chunkId,
    label: heading || "Chunk",
    sourceDocId: docId || null,
  });
}

export async function ensureTaskNode({ workspaceId, taskId, title, createdBy }) {
  return upsertNode({
    workspaceId,
    type: "task",
    refId: taskId,
    label: title || "Task",
    createdBy: createdBy || null,
  });
}

export async function ensureRequirementNode({ workspaceId, requirementId, text, createdBy }) {
  return upsertNode({
    workspaceId,
    type: "requirement",
    refId: requirementId,
    label: text ? String(text).slice(0, 140) : "Requirement",
    createdBy: createdBy || null,
  });
}

export async function createEdgeIfMissing({ workspaceId, fromNodeId, toNodeId, relationType, confidence = 0.5, metadata = {} }) {
  if (!workspaceId || !fromNodeId || !toNodeId || !relationType) return null;
  const relation = String(relationType).toLowerCase();
  if (!EDGE_TYPES.includes(relation)) return null;

  const edgeId = buildEdgeId({ workspaceId, fromNodeId, toNodeId, relationType: relation });
  const payload = {
    workspaceId,
    fromNodeId,
    toNodeId,
    relationType: relation,
    confidence: Number(confidence) || 0.5,
    metadata,
    createdAt: now(),
    updatedAt: now(),
  };
  await db
    .collection("workspace_knowledge_edges")
    .doc(edgeId)
    .set(payload, { merge: true });
  return { id: edgeId, ...payload };
}
