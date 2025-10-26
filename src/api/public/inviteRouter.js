// import express from 'express'
// import { db } from '../../../server/firebaseAdmin.js'
// import { getInviteByToken, acceptInvite } from '../../../server/src/services/inviteService.js'

// const router = express.Router()

// router.get('/:token', async (req, res) => {
//   try {
//     const { token } = req.params
//     const invite = await getInviteByToken(token)
//     if (!invite) return res.status(404).json({ error: 'Invite not found' })

//     const orgSnap = invite.orgId ? await db.doc(`orgs/${invite.orgId}`).get() : null
//     res.json({
//       orgId: invite.orgId,
//       orgName: orgSnap?.get('name') || 'Unknown team',
//       role: invite.role,
//       status: invite.status,
//       expiresAt: invite.expiresAt,
//     })
//   } catch (err) {
//     console.error('GET /api/invites/:token error', err)
//     res.status(500).json({ error: 'Failed to preview invite' })
//   }
// })

// export async function acceptInviteHandler(req, res) {
//   try {
//     const { token } = req.params
//     const uid = req.user?.uid
//     if (!uid) return res.status(401).json({ error: 'Unauthenticated' })

//     const invite = await acceptInvite({ token, uid, userProfile: req.user })
//     res.json({ ok: true, orgId: invite.orgId, role: invite.role })
//   } catch (err) {
//     console.error('POST /api/invites/:token/accept error', err)
//     res.status(err?.status || 500).json({ error: err?.message || 'Failed to accept invite' })
//   }
// }

// export default router

import express from 'express'
import { db } from '../../../server/firebaseAdmin.js'
import { getInviteByToken, acceptInvite } from '../../../server/src/services/inviteService.js'

const router = express.Router()

// 🔍 Preview invite info
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const invite = await getInviteByToken(token)
    if (!invite) return res.status(404).json({ error: 'Invite not found' })

    const orgSnap = invite.orgId ? await db.doc(`orgs/${invite.orgId}`).get() : null

    res.json({
      orgId: invite.orgId,
      orgName: orgSnap?.get('name') || 'Unknown team',
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    })
  } catch (err) {
    console.error('❌ GET /api/invites/:token error', err)
    res.status(500).json({ error: 'Failed to preview invite' })
  }
})

// ✅ Accept invite endpoint
export async function acceptInviteHandler(req, res) {
  try {
    const { token } = req.params
    const uid = req.user?.uid
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' })

    const invite = await acceptInvite({ token, uid, userProfile: req.user })
    res.json({ ok: true, orgId: invite.orgId, role: invite.role })
  } catch (err) {
    console.error('❌ POST /api/invites/:token/accept error', err)
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to accept invite' })
  }
}

export default router