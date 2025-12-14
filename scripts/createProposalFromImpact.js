// Dev helper: create a proposal from a saved change-impact response JSON.
// Usage: node scripts/createProposalFromImpact.js path/to/impact.json workspaceId userId
import fs from "fs";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { createProposal } from "../apps/backend-node/services/knowledge/approvalService.js";

dotenv.config();

function init() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  const [,, path, workspaceId, userId] = process.argv;
  if (!path || !workspaceId || !userId) {
    console.error("Usage: node scripts/createProposalFromImpact.js path/to/impact.json workspaceId userId");
    process.exit(1);
  }
  const raw = fs.readFileSync(path, "utf-8");
  const data = JSON.parse(raw);
  const impacts = Array.isArray(data.impacts) ? data.impacts : [];
  if (!impacts.length || !data.source) {
    console.error("Impact file must contain { source, impacts[] }");
    process.exit(1);
  }

  init();
  const proposal = await createProposal({
    workspaceId,
    source: data.source,
    impacts,
    note: data.changeSummary || null,
    userId,
  });
  console.log("Proposal created:", proposal.id);
  process.exit(0);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
