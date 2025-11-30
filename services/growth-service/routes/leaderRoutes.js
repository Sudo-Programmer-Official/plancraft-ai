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
  getRecentMessages,
  listMessages,
  createMessage,
  updateMessage,
  sendMessageNow,
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
  listLocations,
} from '../controllers/leaderController.js'

const router = Router()

// Overview
router.get('/overview', getOverview)
router.get('/overview/stats', getOverview)

// Contacts
router.get('/contacts', listContacts)
router.post('/contacts', createContact)
router.patch('/contacts/:id', updateContact)
router.put('/contacts/:id', updateContact)
router.delete('/contacts/:id', deleteContact)

// Contact groups
router.get('/contacts/groups', listContactGroups)
router.post('/contacts/groups', createContactGroup)
router.patch('/contacts/groups/:id', updateContactGroup)
router.put('/contacts/groups/:id', updateContactGroup)
router.delete('/contacts/groups/:id', deleteContactGroup)

// Occasions
router.get('/occasions', listOccasions)
router.post('/occasions', createOccasion)
router.patch('/occasions/:id', updateOccasion)
router.put('/occasions/:id', updateOccasion)
router.delete('/occasions/:id', deleteOccasion)

// Messages
router.get('/messages', listMessages)
router.get('/messages/recent', getRecentMessages)
router.post('/messages', createMessage)
router.put('/messages/:id', updateMessage)
router.post('/messages/:id/send-now', sendMessageNow)

// Events
router.get('/events', listEvents)
router.post('/events', createEvent)
router.patch('/events/:id', updateEvent)
router.put('/events/:id', updateEvent)
router.delete('/events/:id', deleteEvent)

// Issues
router.get('/issues', listIssues)
router.post('/issues', createIssue)
router.patch('/issues/:id', updateIssue)
router.put('/issues/:id', updateIssue)
router.delete('/issues/:id', deleteIssue)

// Issue timeline
router.get('/issues/:id/timeline', listIssueTimeline)
router.post('/issues/:id/timeline', addIssueTimelineEntry)

// Legacy stats endpoints used by dashboard
router.get('/events/stats', getEventsStats)
router.get('/occasions/upcoming', getUpcomingOccasions)
router.get('/issues/recent', getRecentIssues)

// Locations (maps)
router.get('/locations', listLocations)

export default router
