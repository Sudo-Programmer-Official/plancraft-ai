import { publishNow, scheduleMessage } from '../services/postingClient.js'
import { createSchedule } from '../firestore/calendarRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function publish(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const payload = req.body || {}
    const response = await publishNow({
      userId,
      channel: payload.platform || payload.channel || 'linkedin',
      mode: payload.mode || 'text',
      recipients: payload.recipients || [],
      groups: payload.groups || [],
      message: payload.caption || payload.message || '',
      audioUrl: payload.audioUrl || null,
      context: { ...(payload.context || {}), source: 'creator', workspaceId: wsId || null },
    })
    res.json({ success: true, response })
  } catch (err) {
    next(err)
  }
}

export async function schedule(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const payload = req.body || {}

    // Persist in creator schedule
    const entry = await createSchedule(userId, {
      platform: payload.platform,
      variant: payload.variant,
      caption: payload.caption,
      mediaUrl: payload.mediaUrl,
      scheduledFor: payload.scheduledFor,
      status: 'pending',
      workspaceId: wsId || null,
    })

    // Forward to posting-service scheduler
    await scheduleMessage({
      channel: payload.platform || 'linkedin',
      mode: payload.mode || 'text',
      recipients: payload.recipients || [],
      groups: payload.groups || [],
      message: payload.caption || payload.message || '',
      scheduleAt: payload.scheduledFor,
      context: { source: 'creator', entryId: entry.id, workspaceId: wsId || null },
    })

    res.json({ success: true, entry })
  } catch (err) {
    next(err)
  }
}
