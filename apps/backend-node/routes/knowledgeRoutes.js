import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import {
  createDocHandler,
  processDocHandler,
  searchKnowledgeHandler,
} from "../controllers/knowledgeController.js";
import { changeImpactHandler } from "../controllers/changeImpactController.js";
import { impactFeedbackHandler } from "../controllers/impactFeedbackController.js";
import { listPoliciesHandler, upsertPolicyHandler } from "../controllers/policyController.js";
import {
  createProposalHandler,
  approveProposalHandler,
  executeActionHandler,
  listProposalsHandler,
  getProposalHandler,
  listActionsHandler,
} from "../controllers/knowledgeApprovalsController.js";
import { ingestEmail, ingestJira, ingestWebhook } from "../controllers/integrationController.js";

const router = express.Router();

const MAX_UPLOAD_BYTES = Number(process.env.KNOWLEDGE_MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const WRITE_ROLES = ["editor", "admin"];
const READ_ROLES = ["viewer", "editor", "admin"];

router.post(
  "/knowledge/docs",
  requireAuth,
  upload.single("file"),
  requireWorkspaceRole(WRITE_ROLES),
  createDocHandler,
);

router.post(
  "/knowledge/docs/:docId/process",
  requireAuth,
  requireWorkspaceRole(WRITE_ROLES),
  processDocHandler,
);

router.get(
  "/knowledge/search",
  requireAuth,
  requireWorkspaceRole(READ_ROLES),
  searchKnowledgeHandler,
);

router.get(
  "/knowledge/policies",
  requireAuth,
  requireWorkspaceRole(["admin", "editor"]),
  listPoliciesHandler,
);

router.post(
  "/knowledge/policies",
  requireAuth,
  requireWorkspaceRole(["admin", "editor"], { skipWorkspaceLoad: true }),
  upsertPolicyHandler,
);

router.post(
  "/knowledge/change-impact",
  requireAuth,
  requireWorkspaceRole(READ_ROLES),
  changeImpactHandler,
);

router.post(
  "/knowledge/impact-feedback",
  requireAuth,
  requireWorkspaceRole(READ_ROLES),
  impactFeedbackHandler,
);

router.post(
  "/knowledge/proposals",
  requireAuth,
  requireWorkspaceRole(READ_ROLES),
  createProposalHandler,
);

router.get(
  "/knowledge/proposals",
  requireAuth,
  requireWorkspaceRole(READ_ROLES),
  listProposalsHandler,
);

router.get(
  "/knowledge/proposals/:proposalId",
  requireAuth,
  getProposalHandler,
);

router.post(
  "/knowledge/proposals/:proposalId/approve",
  requireAuth,
  approveProposalHandler,
);

router.post(
  "/knowledge/proposals/:proposalId/actions/:actionId/execute",
  requireAuth,
  executeActionHandler,
);

router.get(
  "/knowledge/proposals/:proposalId/actions",
  requireAuth,
  listActionsHandler,
);

// Integrations → proposals (server-to-server; still requires auth & membership)
router.post(
  "/integrations/jira",
  requireAuth,
  ingestJira,
);

router.post(
  "/integrations/webhook",
  requireAuth,
  ingestWebhook,
);

router.post(
  "/integrations/email",
  requireAuth,
  ingestEmail,
);

export default router;
