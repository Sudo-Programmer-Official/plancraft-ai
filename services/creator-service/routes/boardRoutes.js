import { Router } from 'express'
import { getBoard } from '../controllers/boardController.js'
import {
  listSlotsController,
  createSlotController,
  updateSlotController,
} from '../controllers/slotController.js'
import { fetchVariant, patchVariant } from '../controllers/variantController.js'

const router = Router()

router.get('/board', getBoard)
router.get('/slots', listSlotsController)
router.post('/slots', createSlotController)
router.patch('/slots/:id', updateSlotController)
router.get('/variants/:id', fetchVariant)
router.patch('/variants/:id', patchVariant)

export default router
