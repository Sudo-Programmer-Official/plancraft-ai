import express from 'express';
import { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { rebuildVault } from '../../services/vaultIndexer.js';
import { searchVault } from '../../services/vaultSearchService.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

const DEFAULT_LIMIT = Number(process.env.VAULT_LIST_LIMIT || 25);
const MAX_LIMIT = Number(process.env.VAULT_LIST_MAX || 100);

function clampLimit(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function serializeVaultDoc(doc, extra = {}) {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type || 'unknown',
    sourceId: data.sourceId || null,
    title: data.title || null,
    summary: data.summary || null,
    content: data.content || null,
    metadata: data.metadata || {},
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    createdBy: data.createdBy || null,
    score: extra.score ?? null,
  };
}

router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const type = typeof req.query.type === 'string' ? req.query.type : null;
    const limit = clampLimit(req.query.limit);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

    let ref = db.collection(`orgs/${orgId}/vault`);
    if (type) {
      ref = ref.where('type', '==', type);
    }
    ref = ref.orderBy('createdAt', 'desc');

    if (cursor) {
      const cursorSnap = await db.doc(`orgs/${orgId}/vault/${cursor}`).get();
      if (!cursorSnap.exists) {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
      ref = ref.startAfter(cursorSnap);
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((doc) => serializeVaultDoc(doc));
    const nextCursor = snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;

    res.json({ items, nextCursor });
  } catch (err) {
    console.error('GET /api/orgs/:orgId/vault error', err);
    res.status(500).json({ error: 'Failed to list vault items' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { orgId } = req.params;
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = clampLimit(req.query.limit);

    const result = await searchVault({ orgId, query, limit });
    const items = (result?.results || []).map((item) => {
      const { embedding, score, ...rest } = item || {};
      return serializeVaultDoc(
        {
          id: item.id,
          data: () => rest,
        },
        { score },
      );
    });

    res.json({ items });
  } catch (err) {
    console.error('GET /api/orgs/:orgId/vault/search error', err);
    res.status(500).json({ error: 'Failed to search vault' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.orgRole)) {
      return res.status(403).json({ error: 'Requires admin or owner role' });
    }
    const { orgId } = req.params;
    const result = await rebuildVault({ orgId });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/orgs/:orgId/vault/refresh error', err);
    res.status(500).json({ error: 'Failed to refresh vault' });
  }
});

router.delete('/:vaultId', async (req, res) => {
  try {
    if (!['owner', 'admin'].includes(req.orgRole)) {
      return res.status(403).json({ error: 'Requires admin or owner role' });
    }
    const { orgId, vaultId } = req.params;
    const ref = db.doc(`orgs/${orgId}/vault/${vaultId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Vault item not found' });
    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/orgs/:orgId/vault/:vaultId error', err);
    res.status(500).json({ error: 'Failed to delete vault item' });
  }
});

export default router;
