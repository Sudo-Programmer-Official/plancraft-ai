import admin, { db } from '../../server/firebaseAdmin.js'

const messaging = admin.messaging()
const USERS_COLLECTION = db.collection('users')
const MEMBER_COLLECTION = (orgId) => db.collection(`orgs/${orgId}/members`)

const MAX_IN_QUERY = 10
const MAX_TOKENS_PER_BATCH = 500

function chunk(array, size) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

async function fetchMemberUids(orgId) {
  const snap = await MEMBER_COLLECTION(orgId).select().get()
  return snap.docs.map((doc) => doc.id)
}

async function fetchTokensForUids(uids, excludeUid = null) {
  const filtered = uids.filter((uid) => !!uid && uid !== excludeUid)
  if (!filtered.length) return []

  const tokenResults = []
  const batches = chunk(filtered, MAX_TOKENS_PER_BATCH)
  for (const batch of batches) {
    const refs = batch.map((uid) => USERS_COLLECTION.doc(uid))
    const snaps = await db.getAll(...refs)
    snaps.forEach((snap) => {
      if (!snap.exists) return
      const token = snap.get('fcmToken')
      if (typeof token === 'string' && token.trim().length) {
        tokenResults.push(token.trim())
      }
    })
  }
  return tokenResults
}

async function cleanupInvalidTokens(tokens) {
  if (!Array.isArray(tokens) || !tokens.length) return
  const uniqueTokens = Array.from(new Set(tokens))
  const batches = chunk(uniqueTokens, MAX_IN_QUERY)
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const snap = await USERS_COLLECTION.where('fcmToken', 'in', batch).get()
        const writes = []
        snap.docs.forEach((doc) => {
          writes.push(doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() }))
        })
        await Promise.all(writes)
      } catch (err) {
        console.warn('[notifier] Failed to clean invalid tokens batch:', err)
      }
    }),
  )
}

async function sendMulticast({ tokens, notification, data, webpush }) {
  if (!tokens?.length) return { successCount: 0, failureCount: 0 }

  const batches = chunk(tokens, MAX_TOKENS_PER_BATCH)
  let successCount = 0
  let failureCount = 0
  const invalidTokens = []

  for (const batch of batches) {
    const message = {
      tokens: batch,
      notification,
      data,
      webpush,
    }

    try {
      const response = await messaging.sendEachForMulticast(message)
      successCount += response.successCount
      failureCount += response.failureCount
      response.responses.forEach((res, index) => {
        if (!res.success && res.error) {
          const code = res.error.code || ''
          if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
            invalidTokens.push(batch[index])
          } else {
            console.warn('[notifier] Failed to deliver FCM message:', code)
          }
        }
      })
    } catch (err) {
      failureCount += batch.length
      console.error('[notifier] sendEachForMulticast failed:', err)
    }
  }

  if (invalidTokens.length) {
    cleanupInvalidTokens(invalidTokens).catch((err) => {
      console.warn('[notifier] Failed to cleanup invalid tokens:', err)
    })
  }

  return { successCount, failureCount }
}

export async function notifyOrgActivity({
  orgId,
  channel = 'feed',
  title = 'Workspace update',
  body = '',
  data = {},
  excludeUid = null,
}) {
  if (!orgId) return { successCount: 0, failureCount: 0 }
  try {
    const uids = await fetchMemberUids(orgId)
    const tokens = await fetchTokensForUids(uids, excludeUid)
    if (!tokens.length) return { successCount: 0, failureCount: 0 }

    const mergedData = {
      channel,
      orgId,
      ...Object.entries(data || {}).reduce((acc, [key, value]) => {
        if (value == null) return acc
        acc[key] = String(value)
        return acc
      }, {}),
    }

    return await sendMulticast({
      tokens,
      notification: { title, body },
      data: mergedData,
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: false,
          data: mergedData,
        },
      },
    })
  } catch (err) {
    console.error('[notifier] notifyOrgActivity failed:', err)
    return { successCount: 0, failureCount: 0, error: err }
  }
}

export async function notifyTaskEvent({ orgId, taskId, title, body, performerUid }) {
  return notifyOrgActivity({
    orgId,
    channel: 'tasks',
    title: title || 'Task updated',
    body: body || 'A task was updated in your workspace.',
    excludeUid: performerUid || null,
    data: {
      taskId,
      url: orgId ? `/team/${orgId}/tasks` : undefined,
    },
  })
}

export async function notifyChatMessage({ orgId, roomId, messageId, senderUid, senderName, preview }) {
  return notifyOrgActivity({
    orgId,
    channel: 'chat',
    title: senderName ? `${senderName} sent a message` : 'New chat message',
    body: preview || 'Check the latest update in chat.',
    excludeUid: senderUid || null,
    data: {
      messageId,
      roomId,
      url: orgId ? `/team/${orgId}/chat` : undefined,
    },
  })
}

export async function notifyMeetingEvent({ orgId, meetingId, title, body, actorUid }) {
  return notifyOrgActivity({
    orgId,
    channel: 'meetings',
    title: title || 'Meeting update',
    body: body || 'Meeting notes were updated.',
    excludeUid: actorUid || null,
    data: {
      meetingId,
      url: orgId ? `/team/${orgId}/meetings` : undefined,
    },
  })
}

export async function notifyVaultEvent({ orgId, itemId, title, body, actorUid }) {
  return notifyOrgActivity({
    orgId,
    channel: 'vault',
    title: title || 'Vault updated',
    body: body || 'New knowledge item shared.',
    excludeUid: actorUid || null,
    data: {
      itemId,
      url: orgId ? `/team/${orgId}/vault` : undefined,
    },
  })
}

export async function notifyTokens({ tokens, title, body, data = {} }) {
  if (!Array.isArray(tokens) || !tokens.length) return { successCount: 0, failureCount: 0 }
  return sendMulticast({
    tokens,
    notification: { title, body },
    data: Object.entries(data || {}).reduce((acc, [key, value]) => {
      if (value == null) return acc
      acc[key] = String(value)
      return acc
    }, {}),
    webpush: {
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data,
      },
    },
  })
}

export default {
  notifyOrgActivity,
  notifyTaskEvent,
  notifyChatMessage,
  notifyMeetingEvent,
  notifyVaultEvent,
  notifyTokens,
}
