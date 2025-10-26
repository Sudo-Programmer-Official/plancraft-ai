// import express from 'express';
// import { db } from '../../../server/firebaseAdmin.js';
// import { withOrgAuth } from './middlewares/withOrgAuth.js';

// const router = express.Router();
// const isAdminLike = (role) => role === 'owner' || role === 'admin';

// // List members
// router.get('/:orgId/members', withOrgAuth, async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const snap = await db.collection('orgs').doc(orgId).collection('members').get();
//     const members = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
//     res.json(members);
//   } catch (err) {
//     console.error('GET members error', err);
//     res.status(500).json({ error: 'Failed to list members' });
//   }
// });

// // Add member (invite/seed)
// router.post('/:orgId/members', withOrgAuth, async (req, res) => {
//   try {
//     if (!isAdminLike(req.orgRole)) return res.status(403).json({ error: 'Insufficient role' });

//     const { orgId } = req.params;
//     const { uid, role = 'member', name = null, email = null } = req.body || {};
//     if (!uid) return res.status(400).json({ error: 'Missing uid' });

//     await db.doc(`orgs/${orgId}/members/${uid}`).set({
//       uid,
//       role,
//       name,
//       email,
//       joinedAt: new Date(),
//     });

//     res.json({ ok: true });
//   } catch (err) {
//     console.error('POST member error', err);
//     res.status(500).json({ error: 'Failed to add member' });
//   }
// });

// // Update member role
// router.patch('/:orgId/members/:uid', withOrgAuth, async (req, res) => {
//   try {
//     if (!isAdminLike(req.orgRole)) return res.status(403).json({ error: 'Insufficient role' });

//     const { orgId, uid } = req.params;
//     const { role } = req.body || {};
//     if (!role) return res.status(400).json({ error: 'Missing role' });

//     const targetRef = db.doc(`orgs/${orgId}/members/${uid}`);
//     const targetSnap = await targetRef.get();
//     if (!targetSnap.exists) return res.status(404).json({ error: 'Member not found' });

//     const targetRole = targetSnap.get('role');
//     if (targetRole === 'owner' && req.orgRole !== 'owner') {
//       return res.status(403).json({ error: 'Only owner can modify owner' });
//     }

//     await targetRef.update({ role });
//     res.json({ ok: true });
//   } catch (err) {
//     console.error('PATCH member error', err);
//     res.status(500).json({ error: 'Failed to update role' });
//   }
// });

// // Remove member
// router.delete('/:orgId/members/:uid', withOrgAuth, async (req, res) => {
//   try {
//     const { orgId, uid } = req.params;

//     if (!isAdminLike(req.orgRole)) return res.status(403).json({ error: 'Insufficient role' });

//     const targetRef = db.doc(`orgs/${orgId}/members/${uid}`);
//     const targetSnap = await targetRef.get();
//     if (!targetSnap.exists) return res.status(404).json({ error: 'Member not found' });

//     const targetRole = targetSnap.get('role');
//     if (targetRole === 'owner') return res.status(400).json({ error: 'Cannot remove owner' });

//     await targetRef.delete();
//     res.json({ ok: true });
//   } catch (err) {
//     console.error('DELETE member error', err);
//     res.status(500).json({ error: 'Failed to remove member' });
//   }
// });

// export default router;
import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import withOrgAuth from "./middlewares/withOrgAuth.js"; // ✅ should be default import

const router = express.Router({ mergeParams: true });

const isAdminLike = (role) => ["owner", "admin"].includes(role);

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/members
 * List all organization members
 * ────────────────────────────────────────────── */
router.get("/:orgId/members", withOrgAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const snap = await db.collection(`orgs/${orgId}/members`).get();

    const members = snap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    }));

    res.json(members);
  } catch (err) {
    console.error("❌ GET members error", err);
    res.status(500).json({ error: "Failed to list members" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/members
 * Add (invite) a new member
 * ────────────────────────────────────────────── */
router.post("/:orgId/members", withOrgAuth, async (req, res) => {
  try {
    if (!isAdminLike(req.orgRole)) {
      return res.status(403).json({ error: "Insufficient role" });
    }

    const { orgId } = req.params;
    const { uid, role = "member", name = null, email = null } = req.body || {};

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const ref = db.doc(`orgs/${orgId}/members/${uid}`);
    await ref.set({
      uid,
      role,
      name,
      email,
      joinedAt: new Date(),
    });

    res.status(201).json({ ok: true, id: uid });
  } catch (err) {
    console.error("❌ POST member error", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

/* ──────────────────────────────────────────────
 * PATCH /api/orgs/:orgId/members/:uid
 * Update a member’s role
 * ────────────────────────────────────────────── */
router.patch("/:orgId/members/:uid", withOrgAuth, async (req, res) => {
  try {
    if (!isAdminLike(req.orgRole)) {
      return res.status(403).json({ error: "Insufficient role" });
    }

    const { orgId, uid } = req.params;
    const { role } = req.body || {};

    if (!role) {
      return res.status(400).json({ error: "Missing role" });
    }

    const targetRef = db.doc(`orgs/${orgId}/members/${uid}`);
    const snap = await targetRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Member not found" });
    }

    const targetRole = snap.get("role");
    if (targetRole === "owner" && req.orgRole !== "owner") {
      return res.status(403).json({ error: "Only owner can modify owner" });
    }

    await targetRef.update({ role, updatedAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ PATCH member error", err);
    res.status(500).json({ error: "Failed to update member role" });
  }
});

/* ──────────────────────────────────────────────
 * DELETE /api/orgs/:orgId/members/:uid
 * Remove a member from organization
 * ────────────────────────────────────────────── */
router.delete("/:orgId/members/:uid", withOrgAuth, async (req, res) => {
  try {
    if (!isAdminLike(req.orgRole)) {
      return res.status(403).json({ error: "Insufficient role" });
    }

    const { orgId, uid } = req.params;
    const ref = db.doc(`orgs/${orgId}/members/${uid}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Member not found" });
    }

    const role = snap.get("role");
    if (role === "owner") {
      return res.status(400).json({ error: "Cannot remove owner" });
    }

    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE member error", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

export default router;
