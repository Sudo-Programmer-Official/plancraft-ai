import cron from 'node-cron'
import { generateReportPDF, buildUserReport, persistReport, renderReportHtml, msToHuman } from '../services/reportService.js'
import { getAllActiveUsers } from '../services/userService.js'
import { sendReportEmail, initEmail } from '../services/emailService.js'

initEmail()

export function initReportScheduler() {
  const enabled = String(process.env.ENABLE_CRON_REPORTS || '').toLowerCase()
  if (enabled !== '1' && enabled !== 'true') {
    console.log('⏳ Report scheduler disabled (set ENABLE_CRON_REPORTS=1 to enable)')
    return
  }
  console.log('⏰ Report scheduler enabled (weekly + monthly)')

  // Weekly (Monday 07:00 UTC)
  cron.schedule('0 7 * * MON', async () => {
    try {
      console.log('[ReportScheduler] Weekly cron fired (Mon 07:00 UTC)')
      const users = await getAllActiveUsers()
      console.log(`[ReportScheduler] Weekly queue size: ${users.length}`)
      for (const u of users) {
        console.log(`[ReportScheduler] Weekly → user=${u.id} email=${u.email || 'n/a'}`)
        await generateAndSendReport(u, 'weekly')
      }
    } catch (e) {
      console.error('Weekly report cron failed:', e)
    }
  })
  console.log('[ReportScheduler] Weekly job registered (Mon 07:00 UTC)')

  // Monthly (1st of month at 07:00 UTC)
  cron.schedule('0 7 1 * *', async () => {
    try {
      console.log('[ReportScheduler] Monthly cron fired (1st 07:00 UTC)')
      const users = await getAllActiveUsers()
      console.log(`[ReportScheduler] Monthly queue size: ${users.length}`)
      for (const u of users) {
        console.log(`[ReportScheduler] Monthly → user=${u.id} email=${u.email || 'n/a'}`)
        await generateAndSendReport(u, 'monthly')
      }
    } catch (e) {
      console.error('Monthly report cron failed:', e)
    }
  })
  console.log('[ReportScheduler] Monthly job registered (1st 07:00 UTC)')
}

async function generateAndSendReport(user, period) {
  try {
    const t0 = Date.now()
    console.log(`[ReportScheduler] Start generate → user=${user?.id} period=${period}`)
    const summary = await buildUserReport(user.id, period)
    const saved = await persistReport(user.id, period, summary)
    const html = renderReportHtml(summary)
    const storageName = `${user.id}/${period}-${summary.start}-${summary.end}-${Date.now()}`
    const pdfUrl = await generateReportPDF(html, storageName)
    const htmlUrl = saved?.urls?.html
    const metrics = {
      period,
      name: user?.name || user?.email?.split('@')[0],
      completed: summary?.metrics?.totalCompleted || 0,
      avgTime: msToHuman(summary?.metrics?.avgCompletionMs || 0),
      topMood: (summary?.metrics?.moods?.[0]?.mood) || 'N/A',
      carryover: '—',
    }
    if (user?.email) {
      await sendReportEmail(user.email, htmlUrl, pdfUrl, metrics)
      console.log(`[ReportScheduler] Email sent → user=${user?.id} period=${period}`)
    }
    console.log(`[ReportScheduler] Done generate → user=${user?.id} period=${period} in ${Date.now() - t0}ms`)
  } catch (e) {
    console.error(`generateAndSendReport failed for user=${user?.id}`, e)
  }
}
