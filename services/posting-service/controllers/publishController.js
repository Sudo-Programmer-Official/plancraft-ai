import { schedulePost, publishImmediately, processDue } from '../services/schedulerService.js'

export async function publishContent(req, res, next) {
  try {
    const payload = req.body || {}
    payload.userId = payload.userId || req.user?.uid
    if (payload.scheduleDate) {
      const scheduled = await schedulePost(payload)
      res.json({ success: true, scheduled })
    } else {
      const result = await publishImmediately(payload)
      res.json({ success: true, result })
    }
  } catch (err) {
    next(err)
  }
}

export async function processScheduled(req, res, next) {
  try {
    const results = await processDue()
    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}
