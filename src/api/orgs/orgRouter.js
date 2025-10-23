import express from 'express';
import { db } from '../../../server/firebaseAdmin.js';

const router = express.Router();

const slugify = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

// Create org and seed owner membership
router.post('/', async (req, res) => {
  try {
    const { name } = req.body || {};
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' });
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const orgData = {
      name,
      slug: slugify(name),
      ownerUid: uid,
      plan: 'free',
      createdAt: new Date(),
      settings: { join_policy: 'invite', default_role: 'member' },
    };

    const orgRef = await db.collection('orgs').add(orgData);

    await db.doc(`orgs/${orgRef.id}/members/${uid}`).set({
      uid,
      role: 'owner',
      joinedAt: new Date(),
      name: req.user?.name || null,
      email: req.user?.email || null,
    });

    res.json({ id: orgRef.id, slug: orgData.slug });
  } catch (err) {
    console.error('POST /api/orgs error', err);
    res.status(500).json({ error: 'Failed to create org' });
  }
});

// List orgs the user belongs to
router.get('/', async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' });

    const snap = await db
      .collectionGroup('members')
      .where('uid', '==', uid)
      .get();

    const orgs = await Promise.all(
      snap.docs.map(async (d) => {
        const orgRef = d.ref.parent.parent; // org doc
        const orgSnap = orgRef ? await orgRef.get() : null;
        return orgSnap?.exists
          ? { id: orgRef.id, role: d.get('role'), name: orgSnap.get('name'), slug: orgSnap.get('slug') }
          : null;
      })
    );

    res.json(orgs.filter(Boolean));
  } catch (err) {
    console.error('GET /api/orgs error', err);
    res.status(500).json({ error: 'Failed to list orgs' });
  }
});

export default router;
