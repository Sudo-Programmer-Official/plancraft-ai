import { db } from '../../server/firebaseAdmin.js';
import { generateAIDigest, generateWeeklyReport } from './aiDigestService.js';
import { getOrgAnalytics } from './analyticsService.js';

const FEED_PAGE_LIMIT = Number(process.env.FEED_PAGE_LIMIT || 25);
const FEED_CACHE_MS = Number(process.env.FEED_CACHE_MS || 8000);

const feedCache = new Map(); // Map<string, { items, nextCursor, expires }>

function vaultCollection(orgId) {
  return db.collection(`orgs/${orgId}/vault`);
}

function feedCacheKey(orgId, filter, cursor, limit) {
  return `${orgId}::${filter}::${cursor || 'root'}::${limit}`;
}

export async function getOrgFeed(orgId, { filter = 'all', cursor = null } = {}) {
  if (!orgId) throw new Error('Missing orgId');

  const key = feedCacheKey(orgId, filter, cursor, FEED_PAGE_LIMIT);
  const cached = feedCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return { items: cached.items, nextCursor: cached.nextCursor };
  }

  let ref = vaultCollection(orgId).orderBy('createdAt', 'desc').limit(FEED_PAGE_LIMIT);
  if (cursor) {
    const cursorSnap = await vaultCollection(orgId).doc(cursor).get();
    if (!cursorSnap.exists) {
      throw new Error('Invalid cursor');
    }
    ref = ref.startAfter(cursorSnap);
  }

  const snap = await ref.get();
  const items = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || 'unknown',
        title: data.title || null,
        content: data.searchText || data.summary || data.content || '',
        summary: data.summary || null,
        createdAt: data.createdAt || null,
        sourceId: data.sourceId || null,
        metadata: data.metadata || {},
      };
    })
    .filter((entry) => filter === 'all' || entry.type === filter);

  const nextCursor = snap.size === FEED_PAGE_LIMIT ? snap.docs[snap.docs.length - 1].id : null;

  feedCache.set(key, {
    items,
    nextCursor,
    expires: Date.now() + FEED_CACHE_MS,
  });

  return {
    items,
    nextCursor,
  };
}

export async function generateOrgDigest(orgId, period = 'weekly') {
  if (!orgId) throw new Error('Missing orgId');

  const snap = await vaultCollection(orgId).orderBy('createdAt', 'desc').limit(50).get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const digest = await generateAIDigest(items, period);
  let report = null;
  try {
    const analytics = await getOrgAnalytics({ orgId, range: '7d' });
    report = await generateWeeklyReport({ items, analytics });
  } catch (err) {
    console.error('[feedService] failed to build weekly report', err);
  }

  return {
    orgId,
    period,
    digest,
    count: items.length,
    report,
  };
}

export function invalidateOrgFeedCache(orgId) {
  const prefix = `${orgId}::`;
  for (const key of Array.from(feedCache.keys())) {
    if (key.startsWith(prefix)) {
      feedCache.delete(key);
    }
  }
}

export default {
  getOrgFeed,
  generateOrgDigest,
  invalidateOrgFeedCache,
};
