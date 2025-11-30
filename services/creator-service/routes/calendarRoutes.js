import { Router } from 'express'
import {
  getSchedule,
  postSchedule,
  putSchedule,
  removeSchedule,
} from '../controllers/calendarController.js'

const router = Router()

router.get('/schedule', getSchedule)
router.post('/schedule', postSchedule)
router.patch('/schedule/:id', putSchedule)
router.delete('/schedule/:id', removeSchedule)

export default router
