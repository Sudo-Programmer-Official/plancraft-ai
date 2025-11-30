import { Router } from 'express'
import { createPostingJob, listPostingJobs } from '../controllers/jobController.js'

const router = Router()

router.post('/api/posting/jobs', createPostingJob)
router.get('/api/posting/jobs', listPostingJobs)

export default router
