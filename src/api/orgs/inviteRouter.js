// import express from 'express'
// import withOrgAuth from './middlewares/withOrgAuth.js'
// import { db } from '../../../server/firebaseAdmin.js'
// import {
//   checkInviteRateLimit,
//   createInvite,
//   listInvites,
//   resendInvite,
//   revokeInvite,
//   validateEmailDomain,
// } from '../../../server/src/services/inviteService.js'

// const router = express.Router({ mergeParams: true })

// router.use(withOrgAuth)

// const ADMIN_ROLES = ['owner', 'admin']

// function validateEmail(email) {
//   if (!email) return false
//   return /.+@.+\..+/.test(String(email).trim())
// }

// function validateRole(role) {
//   const allowed = ['owner', 'admin', 'member', 'viewer']
//   return allowed.includes(String(role || '').toLowerCase())
// }

// function ensureAdmin(req, res) {
//   if (!ADMIN_ROLES.includes(String(req.orgRole))) {
//     res.status(403).json({ error: 'Only admins can manage invites' })
//     return false
//   }
//   return true
// }

// router.get('/', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId } = req.params
//     const records = await listInvites(orgId)
//     res.json(records)
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/invites error', err)
//     res.status(500).json({ error: 'Failed to load invites' })
//   }
// })

// router.post('/validate-domain', (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { email } = req.body || {}
//     if (!email || !validateEmail(email)) {
//       return res.status(400).json({ ok: false, allowed: false, reason: 'Valid email required' })
//     }
//     const allowed = validateEmailDomain(email)
//     res.json({ ok: true, allowed })
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/invites/validate-domain error', err)
//     res.status(500).json({ error: 'Failed to validate domain' })
//   }
// })

// router.post('/', async (req, res) => {
//   try {
//     const { orgId } = req.params
//     const { email, role = 'member', expiresAt = null } = req.body || {}
//     const uid = req.user?.uid || null

//     if (!ensureAdmin(req, res)) return

//     if (!email || !validateEmail(email)) {
//       return res.status(400).json({ error: 'Valid email required' })
//     }
//     if (!validateRole(role)) {
//       return res.status(400).json({ error: 'Invalid role specified' })
//     }
//     if (!validateEmailDomain(email)) {
//       return res.status(400).json({ error: 'Email domain not allowed' })
//     }

//     checkInviteRateLimit(uid)

//     const invite = await createInvite({ orgId, email, role, invitedBy: uid, expiresAt })
//     res.status(201).json(invite)
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/invites error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to create invite' })
//   }
// })

// router.patch('/:inviteId/resend', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId, inviteId } = req.params
//     const uid = req.user?.uid || null
//     const updated = await resendInvite({ orgId, inviteId, requestedBy: uid })
//     res.json(updated)
//   } catch (err) {
//     console.error('PATCH /api/orgs/:orgId/invites/:inviteId/resend error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to resend invite' })
//   }
// })

// router.delete('/:inviteId', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId, inviteId } = req.params
//     const uid = req.user?.uid || null
//     const updated = await revokeInvite({ orgId, inviteId, requestedBy: uid })
//     res.json(updated)
//   } catch (err) {
//     console.error('DELETE /api/orgs/:orgId/invites/:inviteId error', err)
//     const status = err?.status || 500
//     res.status(status).json({ error: err?.message || 'Failed to revoke invite' })
//   }
// })

// router.get('/:inviteId', async (req, res) => {
//   try {
//     if (!ensureAdmin(req, res)) return
//     const { orgId, inviteId } = req.params
//     const doc = await db.doc(`orgs/${orgId}/invites/${inviteId}`).get()
//     if (!doc.exists) return res.status(404).json({ error: 'Invite not found' })
//     res.json({ id: doc.id, ...doc.data() })
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/invites/:inviteId error', err)
//     res.status(500).json({ error: 'Failed to load invite' })
//   }
// })

// export default router

import express from "express";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import { db } from "../../../server/firebaseAdmin.js";
import {
  checkInviteRateLimit,
  createInvite,
  listInvites,
  resendInvite,
  revokeInvite,
  validateEmailDomain,
} from "../../../server/src/services/inviteService.js"; // ✅ fixed import path

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

const ADMIN_ROLES = ["owner", "admin"];

function validateEmail(email) {
  return /.+@.+\..+/.test(String(email || "").trim());
}

function validateRole(role) {
  const allowed = ["owner", "admin", "member", "viewer"];
  return allowed.includes(String(role || "").toLowerCase());
}

function ensureAdmin(req, res) {
  if (!ADMIN_ROLES.includes(String(req.orgRole))) {
    res.status(403).json({ error: "Only admins can manage invites" });
    return false;
  }
  return true;
}

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/invites
 * List all active invites
 * ────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { orgId } = req.params;
    const records = await listInvites(orgId);
    res.json(records);
  } catch (err) {
    console.error("❌ GET invites error", err);
    res.status(500).json({ error: "Failed to load invites" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/invites/validate-domain
 * Validate email domain before sending invite
 * ────────────────────────────────────────────── */
router.post("/validate-domain", (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { email } = req.body || {};
    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ ok: false, allowed: false, reason: "Valid email required" });
    }
    const allowed = validateEmailDomain(email);
    res.json({ ok: true, allowed });
  } catch (err) {
    console.error("❌ POST validate-domain error", err);
    res.status(500).json({ error: "Failed to validate domain" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/invites
 * Create a new invite
 * ────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { orgId } = req.params;
    const { email, role = "member", expiresAt = null } = req.body || {};
    const uid = req.user?.uid || null;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }
    if (!validateRole(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }
    if (!validateEmailDomain(email)) {
      return res.status(400).json({ error: "Email domain not allowed" });
    }

    await checkInviteRateLimit(uid);

    const invite = await createInvite({
      orgId,
      email,
      role,
      invitedBy: uid,
      expiresAt,
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error("❌ POST invite error", err);
    const status = err?.status || 500;
    res
      .status(status)
      .json({ error: err?.message || "Failed to create invite" });
  }
});

/* ──────────────────────────────────────────────
 * PATCH /api/orgs/:orgId/invites/:inviteId/resend
 * Resend an existing invite
 * ────────────────────────────────────────────── */
router.patch("/:inviteId/resend", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { orgId, inviteId } = req.params;
    const uid = req.user?.uid || null;

    const updated = await resendInvite({ orgId, inviteId, requestedBy: uid });
    res.json(updated);
  } catch (err) {
    console.error("❌ PATCH resend invite error", err);
    const status = err?.status || 500;
    res
      .status(status)
      .json({ error: err?.message || "Failed to resend invite" });
  }
});

/* ──────────────────────────────────────────────
 * DELETE /api/orgs/:orgId/invites/:inviteId
 * Revoke (cancel) an invite
 * ────────────────────────────────────────────── */
router.delete("/:inviteId", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { orgId, inviteId } = req.params;
    const uid = req.user?.uid || null;

    const result = await revokeInvite({ orgId, inviteId, requestedBy: uid });
    res.json(result);
  } catch (err) {
    console.error("❌ DELETE invite error", err);
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to revoke invite" });
  }
});

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/invites/:inviteId
 * Fetch a single invite record
 * ────────────────────────────────────────────── */
router.get("/:inviteId", async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { orgId, inviteId } = req.params;
    const doc = await db.doc(`orgs/${orgId}/invites/${inviteId}`).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Invite not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("❌ GET invite error", err);
    res.status(500).json({ error: "Failed to load invite" });
  }
});

export default router;