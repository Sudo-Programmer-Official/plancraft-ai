import express from 'express'
import withOrgAuth from './middlewares/withOrgAuth.js'
import { db } from '../../../server/firebaseAdmin.js'
import {
  checkInviteRateLimit,
  createInvite,
  getInviteByToken,
  validateEmailDomain,
} from '../../services/inviteService.js'

const router = express.Router({ mergeParams: true })

router.use(withOrgAuth)

function validateEmail(email) {
  if (!email) return false
  return /.+@.+\..+/.test(String(email).trim())
}

function validateRole(role) {
  const allowed = ['owner', 'admin', 'member', 'viewer']
  return allowed.includes(String(role || '').toLowerCase())
}

router.post('/', async (req, res) => {
  try {
    const { orgId } = req.params
    const { email, role = 'member', expiresAt = null } = req.body || {}
    const uid = req.user?.uid || null

    if (!['owner', 'admin'].includes(String(req.orgRole))) {
      return res.status(403).json({ error: 'Only admins can invite teammates' })
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' })
    }
    if (!validateRole(role)) {
      return res.status(400).json({ error: 'Invalid role specified' })
    }
    if (!validateEmailDomain(email)) {
      return res.status(400).json({ error: 'Email domain not allowed' })
    }

    checkInviteRateLimit(uid)

    const invite = await createInvite({ orgId, email, role, invitedBy: uid, expiresAt })
    res.status(201).json({ id: invite.id, token: invite.token, expiresAt: invite.expiresAt })
  } catch (err) {
    console.error('POST /api/orgs/:orgId/invites error', err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Failed to create invite' })
  }
})

router.get('/:inviteId', async (req, res) => {
  try {
    const { orgId, inviteId } = req.params
    const doc = await db.doc(`orgs/${orgId}/invites/${inviteId}`).get()
    if (!doc.exists) return res.status(404).json({ error: 'Invite not found' })
    res.json({ id: doc.id, ...doc.data() })
  } catch (err) {
    console.error('GET /api/orgs/:orgId/invites/:inviteId error', err)
    res.status(500).json({ error: 'Failed to load invite' })
  }
})

export default router
