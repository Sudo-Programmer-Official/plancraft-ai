import { Router } from 'express'
import { createPlan, updatePlan, getPlan } from '../controllers/planController.js'

const router = Router()

router.post('/create', createPlan)
router.put('/:id', updatePlan)
router.get('/:id', getPlan)

export default router
