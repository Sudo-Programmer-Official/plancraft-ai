import { runDueJobs } from '../services/schedulerService.js'

export async function runScheduler(req, res, next) {
  try {
    const results = await runDueJobs()
    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}
