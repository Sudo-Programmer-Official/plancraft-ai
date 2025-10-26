// import express from 'express'
// import withOrgAuth from './middlewares/withOrgAuth.js'
// import { db } from '../../../server/firebaseAdmin.js'
// import {
//   saveTemplateFromProject,
//   cloneTemplateToProject,
//   createTemplate,
//   updateTemplate,
//   deleteTemplate,
// } from '../../services/projectCloneService.js'
// import { getTemplateSuggestions } from '../../services/aiSuggestService.js'

// const router = express.Router({ mergeParams: true })

// router.use(withOrgAuth)

// function ensureAdmin(req, res) {
//   const role = String(req.orgRole || '').toLowerCase()
//   if (!['owner', 'admin'].includes(role)) {
//     res.status(403).json({ error: 'Requires admin or owner role' })
//     return false
//   }
//   return true
// }

// const templatesCollection = (orgId) => db.collection(`orgs/${orgId}/templates`)

// function sanitizeTasks(list) {
//   if (!Array.isArray(list)) return []
//   return list
//     .map((task) => ({
//       title: String(task?.title || '').trim() || 'Untitled task',
//       description: String(task?.description || ''),
//       status: task?.status === 'completed' ? 'completed' : 'pending',
//       assignedTo: task?.assignedTo || null,
//       assignees: Array.isArray(task?.assignees) ? task.assignees : [],
//       dueOffsetDays:
//         typeof task?.dueOffsetDays === 'number' && Number.isFinite(task?.dueOffsetDays)
//           ? Math.round(task.dueOffsetDays)
//           : null,
//       metadata: task?.metadata && typeof task.metadata === 'object' ? task.metadata : {},
//       progress:
//         typeof task?.progress === 'number' && Number.isFinite(task.progress)
//           ? Math.min(100, Math.max(0, Math.round(task.progress)))
//           : null,
//       lastNote: task?.lastNote || null,
//     }))
// }

// router.get('/', async (req, res) => {
//   try {
//     const { orgId } = req.params
//     const { type = null, industry = null } = req.query || {}

//     let ref = templatesCollection(orgId).orderBy('updatedAt', 'desc')
//     if (type) ref = ref.where('type', '==', String(type))
//     if (industry) ref = ref.where('industry', '==', String(industry))

//     const snap = await ref.limit(50).get()
//     const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//     res.json(list)
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/templates error', err)
//     res.status(500).json({ error: 'Failed to load templates' })
//   }
// })

// router.get('/suggestions', async (req, res) => {
//   try {
//     const { orgId } = req.params
//     const { type = null, industry = null, limit = 5 } = req.query || {}
//     const suggestions = await getTemplateSuggestions({
//       orgId,
//       limit: Number(limit) || 5,
//       filters: { type, industry },
//     })
//     res.json(suggestions)
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/templates/suggestions error', err)
//     res.status(500).json({ error: 'Failed to load template suggestions' })
//   }
// })

// router.post('/', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId } = req.params
//     const { name, summary, type, industry, tags = [], tasks = [] } = req.body || {}

//     if (!name) return res.status(400).json({ error: 'Missing template name' })

//     const template = await createTemplate({
//       orgId,
//       createdBy: req.user?.uid || null,
//       template: { name, summary, type, industry, tags, tasks: sanitizeTasks(tasks) },
//     })

//     res.status(201).json(template)
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/templates error', err)
//     res.status(500).json({ error: 'Failed to create template' })
//   }
// })

// router.post('/from-project', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId } = req.params
//     const { projectId, name, summary = '', type = 'general', industry = 'general', tags = [] } = req.body || {}
//     if (!projectId) return res.status(400).json({ error: 'Missing projectId' })
//     if (!name) return res.status(400).json({ error: 'Missing template name' })

//     const template = await saveTemplateFromProject({
//       orgId,
//       projectId,
//       createdBy: req.user?.uid || null,
//       template: { name, summary, type, industry, tags },
//     })

//     res.status(201).json(template)
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/templates/from-project error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to save template' })
//   }
// })

// router.post('/:templateId/instantiate', async (req, res) => {
//   try {
//     const { orgId, templateId } = req.params
//     const { name, key, status, leadUid, defaultAssignees } = req.body || {}

//     const result = await cloneTemplateToProject({
//       orgId,
//       templateId,
//       createdBy: req.user?.uid || null,
//       overrides: { name, key, status, leadUid, defaultAssignees },
//     })

//     res.status(201).json(result)
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/templates/:templateId/instantiate error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to create project from template' })
//   }
// })

// router.patch('/:templateId', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId, templateId } = req.params
//     const allowed = ['name', 'summary', 'type', 'industry', 'tags', 'tasks']
//     const updates = {}
//     allowed.forEach((key) => {
//       if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
//         updates[key] = req.body[key]
//       }
//     })
//     if (!Object.keys(updates).length) {
//       return res.status(400).json({ error: 'No valid fields to update' })
//     }
//     if (updates.tasks) {
//       updates.tasks = sanitizeTasks(updates.tasks)
//     }

//     const updated = await updateTemplate({ orgId, templateId, updates })
//     res.json(updated)
//   } catch (err) {
//     console.error('PATCH /api/orgs/:orgId/templates/:templateId error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to update template' })
//   }
// })

// router.delete('/:templateId', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId, templateId } = req.params
//     await deleteTemplate({ orgId, templateId })
//     res.json({ ok: true })
//   } catch (err) {
//     console.error('DELETE /api/orgs/:orgId/templates/:templateId error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to delete template' })
//   }
// })

// export default router
import express from "express";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import { db } from "../../../server/firebaseAdmin.js";

import {
  saveTemplateFromProject,
  cloneTemplateToProject,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../services/projectCloneService.js";

import { getTemplateSuggestions } from "../../services/aiSuggestService.js";

const router = express.Router({ mergeParams: true });

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

router.use(withOrgAuth); // ensures req.user + req.orgMember/req.orgRole is set

const templatesCol = (orgId) => db.collection(`orgs/${orgId}/templates`);

const okRoles = (role) => ["owner", "admin"].includes(String(role || "").toLowerCase());

function ensureAdmin(req, res) {
  const role = req.orgMember?.role || req.orgRole;
  if (!okRoles(role)) {
    res.status(403).json({ error: "Requires admin or owner role" });
    return false;
  }
  return true;
}

const asString = (v, def = "") =>
  typeof v === "string" ? v.trim() : (v == null ? def : String(v).trim());

const asArray = (v) => (Array.isArray(v) ? v : []);
const asNumber = (v, def = null) =>
  typeof v === "number" && Number.isFinite(v) ? v : def;

function sanitizeTags(tags) {
  return asArray(tags)
    .map((t) => asString(t))
    .filter(Boolean)
    .slice(0, 30);
}

function sanitizeTasks(list) {
  if (!Array.isArray(list)) return [];
  return list.map((task) => {
    const title = asString(task?.title) || "Untitled task";
    const description = asString(task?.description);
    const status =
      ["todo", "pending", "in-progress", "done", "completed"].includes(
        asString(task?.status).toLowerCase()
      )
        ? asString(task?.status).toLowerCase()
        : "pending";

    const dueOffsetDays = asNumber(task?.dueOffsetDays);
    const progress = asNumber(task?.progress);
    const safeProgress =
      progress == null
        ? null
        : Math.min(100, Math.max(0, Math.round(progress)));

    const assignedTo = task?.assignedTo || null; // back-compat
    const assignees = asArray(task?.assignees);

    const metadata =
      task?.metadata && typeof task.metadata === "object" ? task.metadata : {};

    return {
      title,
      description,
      status,
      assignedTo,
      assignees,
      dueOffsetDays: dueOffsetDays == null ? null : Math.round(dueOffsetDays),
      metadata,
      progress: safeProgress,
      lastNote: task?.lastNote || null,
    };
  });
}

/* ──────────────────────────────────────────────────────────────
 * GET /api/orgs/:orgId/templates
 * List templates with optional filters + pagination
 * ──────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      type = null,
      industry = null,
      limit = 50,
      startAfter = null,
      includeArchived = "false",
    } = req.query || {};

    let ref = templatesCol(orgId).orderBy("updatedAt", "desc");

    if (type) ref = ref.where("type", "==", asString(type));
    if (industry) ref = ref.where("industry", "==", asString(industry));

    // By default exclude archived
    if (String(includeArchived).toLowerCase() !== "true") {
      ref = ref.where("archived", "==", false);
    }

    if (startAfter) {
      const ts = new Date(startAfter);
      if (!isNaN(ts)) ref = ref.startAfter(ts);
    }

    const snap = await ref.limit(Number(limit) || 50).get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(list);
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/templates error", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * GET /api/orgs/:orgId/templates/:templateId
 * Fetch a single template
 * ──────────────────────────────────────────────────────────── */
router.get("/:templateId", async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    const ref = templatesCol(orgId).doc(templateId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Template not found" });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/templates/:templateId error", err);
    res.status(500).json({ error: "Failed to load template" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * GET /api/orgs/:orgId/templates/suggestions
 * AI-driven template suggestions
 * ──────────────────────────────────────────────────────────── */
router.get("/suggestions", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { type = null, industry = null, limit = 5 } = req.query || {};
    const suggestions = await getTemplateSuggestions({
      orgId,
      limit: Number(limit) || 5,
      filters: { type: asString(type) || null, industry: asString(industry) || null },
    });
    res.json(suggestions || []);
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/templates/suggestions error", err);
    res.status(500).json({ error: "Failed to load template suggestions" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * POST /api/orgs/:orgId/templates
 * Create template (admin/owner)
 * ──────────────────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { orgId } = req.params;

    const name = asString(req.body?.name);
    if (!name) return res.status(400).json({ error: "Missing template name" });

    const summary = asString(req.body?.summary);
    const type = asString(req.body?.type) || "general";
    const industry = asString(req.body?.industry) || "general";
    const tags = sanitizeTags(req.body?.tags);
    const tasks = sanitizeTasks(req.body?.tasks);

    const template = await createTemplate({
      orgId,
      createdBy: req.user?.uid || null,
      template: {
        name,
        summary,
        type,
        industry,
        tags,
        tasks,
        archived: false,
      },
    });

    res.status(201).json(template);
  } catch (err) {
    console.error("❌ POST /api/orgs/:orgId/templates error", err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * POST /api/orgs/:orgId/templates/from-project
 * Save a project as a template (admin/owner)
 * ──────────────────────────────────────────────────────────── */
router.post("/from-project", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { orgId } = req.params;

    const projectId = asString(req.body?.projectId);
    const name = asString(req.body?.name);
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });
    if (!name) return res.status(400).json({ error: "Missing template name" });

    const summary = asString(req.body?.summary);
    const type = asString(req.body?.type) || "general";
    const industry = asString(req.body?.industry) || "general";
    const tags = sanitizeTags(req.body?.tags);

    const template = await saveTemplateFromProject({
      orgId,
      projectId,
      createdBy: req.user?.uid || null,
      template: { name, summary, type, industry, tags, archived: false },
    });

    res.status(201).json(template);
  } catch (err) {
    console.error("❌ POST /api/orgs/:orgId/templates/from-project error", err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to save template" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * POST /api/orgs/:orgId/templates/:templateId/instantiate
 * Create a project from a template (member+ allowed)
 * ──────────────────────────────────────────────────────────── */
router.post("/:templateId/instantiate", async (req, res) => {
  try {
    const { orgId, templateId } = req.params;
    // Any org member can instantiate a template; service can enforce extra checks if needed
    const overrides = {
      name: asString(req.body?.name),
      key: asString(req.body?.key) || null,
      status: asString(req.body?.status) || null,
      leadUid: req.body?.leadUid || null,
      defaultAssignees: asArray(req.body?.defaultAssignees),
    };

    const result = await cloneTemplateToProject({
      orgId,
      templateId,
      createdBy: req.user?.uid || null,
      overrides,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("❌ POST /api/orgs/:orgId/templates/:templateId/instantiate error", err);
    const status = err?.status || 500;
    res
      .status(status)
      .json({ error: err?.message || "Failed to create project from template" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * PATCH /api/orgs/:orgId/templates/:templateId
 * Update template (admin/owner)
 * ──────────────────────────────────────────────────────────── */
router.patch("/:templateId", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { orgId, templateId } = req.params;

    const allowed = ["name", "summary", "type", "industry", "tags", "tasks", "archived"];
    const raw = req.body || {};
    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        updates[key] = raw[key];
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    if (updates.tags) updates.tags = sanitizeTags(updates.tags);
    if (updates.tasks) updates.tasks = sanitizeTasks(updates.tasks);
    if (typeof updates.archived !== "boolean") delete updates.archived;

    // service adds updatedAt internally; we keep it here too for consistency if needed
    const updated = await updateTemplate({ orgId, templateId, updates });
    res.json(updated);
  } catch (err) {
    console.error("❌ PATCH /api/orgs/:orgId/templates/:templateId error", err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to update template" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * DELETE /api/orgs/:orgId/templates/:templateId
 * Soft-delete via service (admin/owner)
 * ──────────────────────────────────────────────────────────── */
router.delete("/:templateId", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { orgId, templateId } = req.params;
    await deleteTemplate({ orgId, templateId }); // service should mark archived + audit
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /api/orgs/:orgId/templates/:templateId error", err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to delete template" });
  }
});

export default router;