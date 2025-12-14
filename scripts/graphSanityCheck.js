// Quick integrity assertions for knowledge graph collections.
// Run manually or in deploy pipeline to catch bad data early.
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const NODE_TYPES = ["doc", "chunk", "task", "requirement"];
const EDGE_TYPES = ["derived_from", "implements"];

function init() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  init();
  const db = admin.firestore();

  const nodeSnap = await db.collection("workspace_knowledge_nodes").limit(200).get();
  nodeSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (!NODE_TYPES.includes(data.type)) {
      throw new Error(`Invalid node type ${data.type} on ${doc.id}`);
    }
    if (!data.workspaceId) {
      throw new Error(`Missing workspaceId on node ${doc.id}`);
    }
  });

  const edgeIds = new Set();
  const edgeTuples = new Set();
  const edgeSnap = await db.collection("workspace_knowledge_edges").limit(200).get();
  edgeSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (edgeIds.has(doc.id)) {
      throw new Error(`Duplicate edge id ${doc.id}`);
    }
    edgeIds.add(doc.id);

    if (!EDGE_TYPES.includes(data.relationType)) {
      throw new Error(`Invalid edge type ${data.relationType} on ${doc.id}`);
    }
    if (!data.workspaceId) {
      throw new Error(`Missing workspaceId on edge ${doc.id}`);
    }
    if (!data.fromNodeId || !data.toNodeId) {
      throw new Error(`Missing from/to on edge ${doc.id}`);
    }
    if (data.fromNodeId === data.toNodeId) {
      throw new Error(`Self-edge detected on ${doc.id}`);
    }
    const tupleKey = `${data.workspaceId}|${data.fromNodeId}|${data.toNodeId}|${data.relationType}`;
    if (edgeTuples.has(tupleKey)) {
      throw new Error(`Duplicate edge tuple ${tupleKey}`);
    }
    edgeTuples.add(tupleKey);
  });

  console.log("Graph sanity check passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
