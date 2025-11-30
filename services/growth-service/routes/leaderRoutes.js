import { Router } from 'express'
import {
  getOverview,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  listOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  listIssueTimeline,
  addIssueTimelineEntry,
  getEventsStats,
  getUpcomingOccasions,
  getRecentIssues,
} from '../controllers/leaderController.js'

const router = Router()

// Overview
router.get('/overview', getOverview)

// Contacts
router.get('/contacts', listContacts)
router.post('/contacts', createContact)
router.patch('/contacts/:id', updateContact)
router.delete('/contacts/:id', deleteContact)

// Contact groups
router.get('/contacts/groups', listContactGroups)
router.post('/contacts/groups', createContactGroup)
router.patch('/contacts/groups/:id', updateContactGroup)
router.delete('/contacts/groups/:id', deleteContactGroup)

// Occasions
router.get('/occasions', listOccasions)
router.post('/occasions', createOccasion)
router.patch('/occasions/:id', updateOccasion)
router.delete('/occasions/:id', deleteOccasion)

// Events
router.get('/events', listEvents)
router.post('/events', createEvent)
router.patch('/events/:id', updateEvent)
router.delete('/events/:id', deleteEvent)

// Issues
router.get('/issues', listIssues)
router.post('/issues', createIssue)
router.patch('/issues/:id', updateIssue)
router.delete('/issues/:id', deleteIssue)

// Issue timeline
router.get('/issues/:id/timeline', listIssueTimeline)
router.post('/issues/:id/timeline', addIssueTimelineEntry)

// Legacy stats endpoints used by dashboard
router.get('/events/stats', getEventsStats)
router.get('/occasions/upcoming', getUpcomingOccasions)
router.get('/issues/recent', getRecentIssues)

export default router
