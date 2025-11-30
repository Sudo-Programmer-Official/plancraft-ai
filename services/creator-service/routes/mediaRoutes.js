import { Router } from 'express'
import { upload, recordMedia } from '../controllers/mediaController.js'

const router = Router()

router.post('/media/upload', upload)
router.post('/media', recordMedia)

export default router
