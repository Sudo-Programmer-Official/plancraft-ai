import { Router } from 'express'
import { generateHook, generateOutline, generateCta, saveEditorContent } from '../controllers/editorController.js'

const router = Router()

router.post('/editor/hook', generateHook)
router.post('/editor/outline', generateOutline)
router.post('/editor/cta', generateCta)
router.post('/editor/save', saveEditorContent)

export default router
