import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { deleteUserAccount } from '../services/accountDeletionService.js'

const router = express.Router()

router.delete('/account', requireAuth, async (req, res) => {
  try {
    const summary = await deleteUserAccount(req.user.uid, {
      email: req.user?.email || null,
    })
    return res.json({
      success: true,
      message: 'Account deleted successfully',
      summary,
    })
  } catch (error) {
    console.error('[AccountRoutes] account deletion failed', error?.message || error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    })
  }
})

export default router
