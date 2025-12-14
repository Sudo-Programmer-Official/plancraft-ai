import { db } from "../firebaseAdmin.js";

const NODE_COLLECTION = "workspace_knowledge_nodes";
const EDGE_COLLECTION = "workspace_knowledge_edges";

const DEFAULT_MAX_HOPS = 2;
const DEFAULT_MAX_ITEMS = 20;
const CONFIDENCE_FLOOR = 0.35;
const HOP_DECAY = {
  0: 1,
  1: 1,
  2: 0.7,
};

function clampMaxHops(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_HOPS;
  return Math.max(1, Math.min(2, Math.floor(n)));
}

function clampMaxItems(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_ITEMS;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

async function getNodeById(workspaceId, nodeId) {
  if (!nodeId) return null;
  const snap = await db.collection(NODE_COLLECTION).doc(nodeId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.workspaceId !== workspaceId) return null;
  return { id: snap.id, ...data };
}

async function getNodeByRef(workspaceId, type, refId) {
  if (!workspaceId || !type || !refId) return null;
  const snap = await db
    .collection(NODE_COLLECTION)
    .where("workspaceId", "==", workspaceId)
    .where("type", "==", type)
    .where("refId", "==", refId)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, ...(doc.data() || {}) };
}

async function resolveSourceNode(workspaceId, source = {}) {
  const { id, nodeId, refId, type } = source || {};
  const preferredId = id || nodeId || null;
  if (preferredId) {
    const byId = await getNodeById(workspaceId, preferredId);
    if (byId) return byId;
  }
  if (type && refId) {
    const byRef = await getNodeByRef(workspaceId, type, refId);
    if (byRef) return byRef;
  }
  if (type && preferredId) {
    const fallback = await getNodeByRef(workspaceId, type, preferredId);
    if (fallback) return fallback;
  }
  return null;
}

async function fetchEdgesForNodes(workspaceId, nodeIds = []) {
  if (!workspaceId || !nodeIds.length) return [];
  const ids = Array.from(new Set(nodeIds.filter(Boolean)));
  const edges = [];
  const batches = [];
  for (let i = 0; i < ids.length; i += 10) {
    batches.push(ids.slice(i, i + 10));
  }

  for (const batch of batches) {
    const fromSnap = await db
      .collection(EDGE_COLLECTION)
      .where("workspaceId", "==", workspaceId)
      .where("fromNodeId", "in", batch)
      .limit(200)
      .get();
    fromSnap.forEach((doc) => edges.push({ id: doc.id, ...(doc.data() || {}) }));

    const toSnap = await db
      .collection(EDGE_COLLECTION)
      .where("workspaceId", "==", workspaceId)
      .where("toNodeId", "in", batch)
      .limit(200)
      .get();
    toSnap.forEach((doc) => edges.push({ id: doc.id, ...(doc.data() || {}) }));
  }
  return edges;
}

async function fetchNodeById(workspaceId, nodeId) {
  return getNodeById(workspaceId, nodeId);
}

function relationReason(edge, currentNode, neighborNode) {
  const rel = String(edge.relationType || "").toLowerCase();
  const currentIsFrom = edge.fromNodeId === currentNode.id;
  const currentIsTo = edge.toNodeId === currentNode.id;

  if (rel === "derived_from") {
    if (currentIsTo) {
      return `Connected via derived_from: ${neighborNode.type || "node"} was derived from the changed ${currentNode.type || "source"}.`;
    }
    if (currentIsFrom) {
      return `Connected via derived_from: ${currentNode.type || "source"} was derived from ${neighborNode.type || "node"}.`;
    }
  }
  if (rel === "implements") {
    if (currentIsTo) {
      return `${neighborNode.type || "node"} implements the changed ${currentNode.type || "source"}.`;
    }
    if (currentIsFrom) {
      return `${currentNode.type || "source"} implements ${neighborNode.type || "node"}.`;
    }
  }
  return `Connected via ${rel || "relationship"} to the changed item.`;
}

function proposalsFor(nodeType) {
  const t = String(nodeType || "").toLowerCase();
  if (t === "task") return ["review", "update"];
  if (t === "requirement") return ["review", "update"];
  if (t === "doc" || t === "chunk") return ["review"];
  return ["review"];
}

export async function assessChangeImpact({ workspaceId, source, changeSummary, maxHops, maxItems }) {
  const effectiveMaxHops = clampMaxHops(maxHops);
  const effectiveMaxItems = clampMaxItems(maxItems);

  const sourceNode = await resolveSourceNode(workspaceId, source);
  if (!sourceNode) {
    throw new Error("Source node not found in workspace");
  }

  const visited = new Map();
  const impacts = new Map();
  const hopCounts = { 0: 1, 1: 0, 2: 0 };
  let visitedEdges = 0;

  visited.set(sourceNode.id, { node: sourceNode, confidence: 1, depth: 0, reason: null });
  let frontier = [{ node: sourceNode, confidence: 1, depth: 0 }];

  for (let depth = 0; depth < effectiveMaxHops; depth += 1) {
    const frontierIds = frontier.map((f) => f.node.id);
    if (!frontierIds.length) break;
    const edges = await fetchEdgesForNodes(workspaceId, frontierIds);
    visitedEdges += edges.length;

    const nextFrontier = [];
    for (const edge of edges) {
      const edgeConf = Number(edge.confidence) || 0.5;
      const hopDecay = HOP_DECAY[Math.min(depth + 1, 2)] || 0.7;
      for (const current of frontier) {
        const currentId = current.node.id;
        let neighborId = null;
        let direction = null;
        if (edge.fromNodeId === currentId) {
          neighborId = edge.toNodeId;
          direction = "out";
        } else if (edge.toNodeId === currentId) {
          neighborId = edge.fromNodeId;
          direction = "in";
        } else {
          continue;
        }

        if (!neighborId || neighborId === currentId) continue;

        const pathConfidence = current.confidence * edgeConf * hopDecay;
        const existing = visited.get(neighborId);
        if (existing && existing.confidence >= pathConfidence) {
          continue;
        }

        const neighborNode = await fetchNodeById(workspaceId, neighborId);
        if (!neighborNode) continue;

        visited.set(neighborId, {
          node: neighborNode,
          confidence: pathConfidence,
          depth: depth + 1,
        });
        hopCounts[depth + 1] = (hopCounts[depth + 1] || 0) + 1;

        const reason = relationReason(edge, current.node, neighborNode);
        const existingImpact = impacts.get(neighborId);
        const bestConfidence = Math.max(pathConfidence, existingImpact?.confidence || 0);
        const reasonToUse = pathConfidence >= (existingImpact?.confidence || 0) ? reason : existingImpact?.reason;

        impacts.set(neighborId, {
          nodeId: neighborId,
          refId: neighborNode.refId || null,
          nodeType: neighborNode.type || null,
          confidence: bestConfidence,
          reason: reasonToUse,
          proposals: proposalsFor(neighborNode.type),
        });

        if (depth + 1 < effectiveMaxHops) {
          nextFrontier.push({ node: neighborNode, confidence: pathConfidence, depth: depth + 1 });
        }
      }
    }

    frontier = nextFrontier;
  }

  const impactList = Array.from(impacts.values())
    .filter((item) => item.confidence >= CONFIDENCE_FLOOR && item.reason)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, effectiveMaxItems);

  return {
    sourceNode: {
      nodeId: sourceNode.id,
      refId: sourceNode.refId || null,
      type: sourceNode.type || null,
      label: sourceNode.label || null,
    },
    impacts: impactList,
    stats: {
      visitedNodes: visited.size,
      visitedEdges,
      hopCounts,
      maxHops: effectiveMaxHops,
    },
    changeSummary: changeSummary || null,
  };
}
