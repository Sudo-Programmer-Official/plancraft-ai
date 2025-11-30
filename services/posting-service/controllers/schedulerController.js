import { runDueJobs } from '../services/schedulerService.js'
import { processDueJobs } from '../services/jobQueueService.js'

export async function runScheduler(req, res, next) {
  try {
    const [messages, jobs] = await Promise.all([runDueJobs(), processDueJobs()])
    res.json({ success: true, messages, jobs })
  } catch (err) {
    next(err)
  }
}
