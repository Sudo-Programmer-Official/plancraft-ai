import admin from 'firebase-admin'
import Stripe from 'stripe'
import { db } from './firebaseAdmin.js'
import {
  listUserWorkspaces,
  listWorkspaceMembers,
  setWorkspaceMemberRole,
  updateWorkspace,
  recomputeSeatsUsed,
} from './workspaceService.js'

const BATCH_SIZE = 200
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' }) : null

const USER_SCOPED_COLLECTIONS = [
  'tasks',
  'reminders',
  'journalEntries',
  'reports',
  'voiceLogs',
  'playbooks',
  'playbook_steps',
  'habit_tracker',
  'feedback',
  'integrationAccounts',
  'externalEvents',
  'gptAuthLinks',
  'gptAuthTokens',
  'mobileAuthHandoffs',
  'oauth_state',
  'delivery_logs',
  'retention_events',
  'retention_nudges',
  'email_logs',
]

const WORKSPACE_SCOPED_COLLECTIONS = [
  'tasks',
  'reports',
  'workspace_members',
  'workspace_invites',
  'workspace_billing_intents',
  'workspace_docs',
  'workspace_doc_chunks',
  'workspace_knowledge_nodes',
  'workspace_knowledge_edges',
  'impact_proposals',
  'proposal_approvals',
  'approval_actions',
  'audit_log',
  'workspace_policies',
]

function buildWorkspaceMembershipDocId(workspaceId, userId) {
  return `${String(workspaceId || '').trim()}_${String(userId || '').trim()}`
}

function chunk(items = [], size = BATCH_SIZE) {
  const out = []
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size))
  }
  return out
}

async function deleteDocRefs(refs = []) {
  let deleted = 0
  for (const group of chunk(refs, BATCH_SIZE)) {
    if (!group.length) continue
    const batch = db.batch()
    group.forEach((ref) => batch.delete(ref))
    await batch.commit()
    deleted += group.length
  }
  return deleted
}

async function deleteDocsFromQuery(buildQuery) {
  let total = 0
  while (true) {
    const snapshot = await buildQuery().limit(BATCH_SIZE).get()
    if (snapshot.empty) return total
    total += await deleteDocRefs(snapshot.docs.map((doc) => doc.ref))
    if (snapshot.size < BATCH_SIZE) return total
  }
}

async function deleteDocsWhere(collectionName, field, value) {
  if (!collectionName || field == null || value == null || value === '') return 0
  return deleteDocsFromQuery(() => db.collection(collectionName).where(field, '==', value))
}

async function deleteDocsByDocumentIdPrefix(collectionName, prefix) {
  const normalizedPrefix = String(prefix || '').trim()
  if (!collectionName || !normalizedPrefix) return 0
  return deleteDocsFromQuery(() =>
    db
      .collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .startAt(normalizedPrefix)
      .endAt(`${normalizedPrefix}\uf8ff`),
  )
}

async function deleteCollectionReferenceDocs(collectionRef) {
  if (!collectionRef) return 0
  return deleteDocsFromQuery(() => collectionRef)
}

async function deleteUserSubcollections(userId) {
  const ref = db.collection('users').doc(String(userId))
  const subcollections = await ref.listCollections()
  let deleted = 0
  for (const subcollection of subcollections) {
    deleted += await deleteCollectionReferenceDocs(subcollection)
  }
  return deleted
}

async function deleteDirectDoc(collectionName, docId) {
  const normalizedDocId = String(docId || '').trim()
  if (!collectionName || !normalizedDocId) return 0
  const ref = db.collection(collectionName).doc(normalizedDocId)
  const snap = await ref.get()
  if (!snap.exists) return 0
  await ref.delete()
  return 1
}

function memberPriority(role = '') {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'owner') return 0
  if (normalized === 'admin') return 1
  if (normalized === 'editor') return 2
  return 3
}

function pickWorkspaceTransferTarget(members = [], deletedUserId) {
  return members
    .filter((member) => String(member?.userId || '') !== String(deletedUserId || ''))
    .sort((left, right) => {
      const roleDelta = memberPriority(left?.role) - memberPriority(right?.role)
      if (roleDelta !== 0) return roleDelta
      const leftJoined = new Date(left?.joined_at || 0).getTime()
      const rightJoined = new Date(right?.joined_at || 0).getTime()
      return leftJoined - rightJoined
    })[0] || null
}

async function removeMembershipDocs(workspaceId, userId) {
  const batch = db.batch()
  batch.delete(db.collection('workspace_members').doc(buildWorkspaceMembershipDocId(workspaceId, userId)))
  batch.delete(db.collection('users').doc(String(userId)).collection('memberships').doc(String(workspaceId)))
  await batch.commit()
}

async function deleteWorkspaceArtifacts(workspaceId) {
  let deleted = 0
  for (const collectionName of WORKSPACE_SCOPED_COLLECTIONS) {
    deleted += await deleteDocsWhere(collectionName, 'workspaceId', String(workspaceId))
  }
  deleted += await deleteDirectDoc('workspace_engagement_state', workspaceId)
  deleted += await deleteDirectDoc('workspaces', workspaceId)
  return deleted
}

async function cancelStripeSubscriptionBestEffort(userDoc = {}, warnings = []) {
  if (!stripe) return false
  const subId = String(
    userDoc?.subscription?.stripeSubId ||
      userDoc?.subscription?.id ||
      '',
  ).trim()
  if (!subId || !subId.startsWith('sub_')) return false
  try {
    await stripe.subscriptions.cancel(subId)
    return true
  } catch (error) {
    warnings.push(`stripe_cancel_failed:${error?.message || String(error)}`)
    return false
  }
}

export async function deleteUserAccount(userId, { email = null } = {}) {
  const uid = String(userId || '').trim()
  if (!uid) throw new Error('deleteUserAccount requires userId')

  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  const userData = userSnap.exists ? (userSnap.data() || {}) : {}
  const emailLower = String(email || userData?.email || '').trim().toLowerCase() || null

  const summary = {
    userId: uid,
    collections: {},
    workspacesTransferred: 0,
    workspacesDeleted: 0,
    membershipsRemoved: 0,
    subcollectionDocsDeleted: 0,
    directDocsDeleted: 0,
    stripeCancelled: false,
    authDeleted: false,
    warnings: [],
  }

  const addCount = (label, count) => {
    if (!count) return
    summary.collections[label] = (summary.collections[label] || 0) + count
  }

  const runStep = async (label, work) => {
    try {
      return await work()
    } catch (error) {
      console.warn(`[AccountDeletion] ${label} failed`, error?.message || error)
      summary.warnings.push(`${label}:${error?.message || String(error)}`)
      return 0
    }
  }

  const userWorkspaces = await runStep('list_workspaces', () => listUserWorkspaces(uid))
  if (Array.isArray(userWorkspaces)) {
    for (const workspace of userWorkspaces) {
      if (!workspace?.id) continue
      const workspaceId = String(workspace.id)
      const isOwner = String(workspace.ownerId || '') === uid || String(workspace.role || '') === 'owner'

      if (isOwner) {
        const members = await runStep(`workspace_members:${workspaceId}`, () => listWorkspaceMembers(workspaceId))
        const transferTarget = pickWorkspaceTransferTarget(Array.isArray(members) ? members : [], uid)

        if (transferTarget?.userId) {
          const transferred = await runStep(`workspace_transfer:${workspaceId}`, async () => {
            await setWorkspaceMemberRole(workspaceId, transferTarget.userId, 'owner', {
              email: transferTarget.email || null,
              joined_at: transferTarget.joined_at || new Date(),
              status: 'active',
            })
            await updateWorkspace(workspaceId, { ownerId: transferTarget.userId })
            return 1
          })
          if (transferred) summary.workspacesTransferred += 1
        } else {
          const workspaceDeleted = await runStep(`workspace_delete:${workspaceId}`, () => deleteWorkspaceArtifacts(workspaceId))
          addCount('workspace_artifacts', workspaceDeleted)
          if (workspaceDeleted) summary.workspacesDeleted += 1
          continue
        }
      }

      const membershipRemoved = await runStep(`workspace_membership_remove:${workspaceId}`, async () => {
        await removeMembershipDocs(workspaceId, uid)
        await recomputeSeatsUsed(workspaceId, { excludeViewers: true })
        return 1
      })
      if (membershipRemoved) summary.membershipsRemoved += 1
    }
  }

  addCount('workspace_memberships', await runStep('workspace_member_rows', () => deleteDocsWhere('workspace_members', 'userId', uid)))

  if (emailLower) {
    addCount('workspace_invites', await runStep('workspace_invites_email', () => deleteDocsWhere('workspace_invites', 'emailLower', emailLower)))
  }

  for (const collectionName of USER_SCOPED_COLLECTIONS) {
    addCount(collectionName, await runStep(`delete_${collectionName}`, () => deleteDocsWhere(collectionName, 'userId', uid)))
  }

  addCount('mobileAuthHandoffs', await runStep('delete_mobile_handoffs_uid', () => deleteDocsWhere('mobileAuthHandoffs', 'uid', uid)))
  addCount('usage', await runStep('delete_usage', () => deleteDocsByDocumentIdPrefix('usage', `${uid}_`)))

  summary.subcollectionDocsDeleted += await runStep('delete_user_subcollections', () => deleteUserSubcollections(uid))
  summary.directDocsDeleted += await runStep('delete_user_notification_prefs', () => deleteDirectDoc('user_notification_prefs', uid))
  summary.directDocsDeleted += await runStep('delete_user_engagement_state', () => deleteDirectDoc('user_engagement_state', uid))

  summary.stripeCancelled = await cancelStripeSubscriptionBestEffort(userData, summary.warnings)

  try {
    await admin.auth().deleteUser(uid)
    summary.authDeleted = true
  } catch (error) {
    const code = String(error?.code || '')
    if (code === 'auth/user-not-found') {
      summary.authDeleted = true
    } else {
      throw error
    }
  }

  summary.directDocsDeleted += await runStep('delete_user_doc', () => deleteDirectDoc('users', uid))

  return summary
}
