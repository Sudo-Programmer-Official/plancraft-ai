import { Router } from 'express'
import { listContacts, listGroups, resolveGroups } from '../controllers/contactsController.js'

const router = Router()

router.get('/', listContacts)
router.get('/groups', listGroups)
router.get('/groups/resolve', resolveGroups)

export default router
