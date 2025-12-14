import { ingestExternalEvent } from "../services/knowledge/integrationService.js";

function selectWorkspaceId(req) {
  return (
    req.body?.workspaceId ||
    req.body?.workspace_id ||
    req.params?.workspaceId ||
    req.query?.workspaceId ||
    req.headers?.["x-workspace-id"] ||
    null
  );
}

export async function ingestJira(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { event, issue } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!issue || !issue.key) return res.status(400).json({ error: "issue.key is required" });
    const envelope = {
      source: "jira",
      event: event || "issue_created",
      workspaceId,
      eventId: issue.id || issue.key,
      payload: {
        issueKey: issue.key,
        summary: issue.summary,
        description: issue.description,
        url: issue.url,
        project: issue.project,
        labels: issue.labels,
        reporter: issue.reporter,
        assignee: issue.assignee,
      },
    };
    const result = await ingestExternalEvent({ envelope, userId: req.user?.uid || null });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to ingest Jira event" });
  }
}

export async function ingestWebhook(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { event, payload, eventId, occurredAt } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const envelope = {
      source: "webhook",
      event: event || "webhook_event",
      workspaceId,
      eventId,
      occurredAt,
      payload: payload || {},
    };
    const result = await ingestExternalEvent({ envelope, userId: req.user?.uid || null });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to ingest webhook" });
  }
}

export async function ingestEmail(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { subject, from, to, body, eventId, occurredAt } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const envelope = {
      source: "email",
      event: "received",
      workspaceId,
      eventId,
      occurredAt,
      payload: { subject, from, to, body },
    };
    const result = await ingestExternalEvent({ envelope, userId: req.user?.uid || null });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to ingest email" });
  }
}
