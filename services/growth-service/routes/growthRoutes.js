import { Router } from 'express'
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  generateOutreach,
  generateComment,
  generateCommunityPost,
  searchProspects,
  searchInvestors,
} from '../controllers/growthController.js'

const router = Router()

router.post('/campaign/create', createCampaign)
router.post('/campaign/:id/update', updateCampaign)
router.post('/campaign/:id/delete', deleteCampaign)

router.post('/generate/outreach-message', generateOutreach)
router.post('/generate/comment', generateComment)
router.post('/generate/community-post', generateCommunityPost)
router.post('/search/prospects', searchProspects)
router.post('/search/investors', searchInvestors)

export default router
