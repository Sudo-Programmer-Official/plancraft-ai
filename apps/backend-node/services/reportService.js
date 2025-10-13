import { db, uploadBufferToStorage } from './firebaseAdmin.js'
import dayjs from 'dayjs'

function ymd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rangeFor(period) {
  const now = dayjs()
  if (period === 'weekly') {
    const end = now.endOf('day')
    const start = end.subtract(6, 'day').startOf('day')
    return { start: start.toDate(), end: end.toDate(), startYMD: start.format('YYYY-MM-DD'), endYMD: end.format('YYYY-MM-DD') }
  }
  if (period === 'monthly') {
    const end = now.endOf('day')
    const start = now.startOf('month')
    return { start: start.toDate(), end: end.toDate(), startYMD: start.format('YYYY-MM-DD'), endYMD: end.format('YYYY-MM-DD') }
  }
  throw new Error('Invalid period')
}

function toDate(val) {
  if (!val) return null
  if (val.toDate) return val.toDate()
  if (typeof val === 'string' || typeof val === 'number') return new Date(val)
  return null
}

export async function buildUserReport(uid, period) {
  const { startYMD, endYMD } = rangeFor(period)

  // Tasks in range by date field (YYYY-MM-DD)
  const tasksSnap = await db
    .collection('tasks')
    .where('userId', '==', uid)
    .where('date', '>=', startYMD)
    .where('date', '<=', endYMD)
    .get()

  const tasks = []
  tasksSnap.forEach((d) => tasks.push({ id: d.id, ...d.data() }))

  const completed = tasks.filter((t) => !!t.completed)
  const totalCompleted = completed.length

  // Avg completion time: (completedAt || updatedAt) - createdAt
  let totalMs = 0
  let denom = 0
  completed.forEach((t) => {
    const created = toDate(t.createdAt)
    const done = toDate(t.completedAt) || toDate(t.updatedAt)
    if (created && done && done > created) {
      totalMs += (done - created)
      denom += 1
    }
  })
  const avgCompletionMs = denom ? Math.round(totalMs / denom) : 0

  // Tags heuristic: parse #tags in title
  const tagCounts = {}
  for (const t of tasks) {
    const title = String(t.title || '')
    const matches = title.match(/#([\p{L}0-9_-]+)/gu) || []
    matches.forEach((m) => {
      const tag = m.replace(/^#/, '').toLowerCase()
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }))

  // Journal entries in range
  const journalSnap = await db
    .collection('journalEntries')
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .get()
  const entries = []
  journalSnap.forEach((d) => {
    const data = d.data()
    // Filter by date string if present
    const dateStr = typeof data.date === 'string' ? data.date : (data.createdAt?.toDate ? ymd(data.createdAt.toDate()) : null)
    if (!dateStr) return
    if (dateStr >= startYMD && dateStr <= endYMD) entries.push({ id: d.id, ...data })
  })

  // Mood patterns
  const moodCounts = {}
  for (const e of entries) {
    const mood = e?.mood?.label || e?.mood || null
    if (!mood) continue
    const key = String(mood).toLowerCase()
    moodCounts[key] = (moodCounts[key] || 0) + 1
  }
  const moods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({ mood, count }))

  // Voice logs summary: placeholder (0) unless a collection exists
  let voiceLogs = 0
  try {
    const vsnap = await db.collection('voiceLogs').where('userId', '==', uid).get()
    voiceLogs = vsnap.size || 0
  } catch {}

  const summary = {
    userId: uid,
    period,
    start: startYMD,
    end: endYMD,
    metrics: {
      totalTasks: tasks.length,
      totalCompleted,
      avgCompletionMs,
      topTags,
      moods,
      voiceLogs,
    },
    generatedAt: new Date().toISOString(),
  }
  return summary
}

export function msToHuman(ms) {
  if (!ms) return 'N/A'
  const hrs = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return `${hrs ? hrs + 'h ' : ''}${mins}m`
}

export function renderReportHtml(summary) {
  const m = summary.metrics || {}
  const tagHtml = (m.topTags || [])
    .map((t) => `<li>#${t.tag} — ${t.count}</li>`)
    .join('')
  const moodHtml = (m.moods || [])
    .map((x) => `<li>${x.mood} — ${x.count}</li>`)
    .join('')
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>PlanCraftAI ${summary.period} Report</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1020;color:#eef;line-height:1.5;padding:24px} .card{background:#121833;border:1px solid #2a3160;border-radius:12px;padding:16px;margin:12px 0} h1,h2{margin:0 0 8px} small{opacity:.8}</style>
</head><body>
<h1>PlanCraftAI ${summary.period[0].toUpperCase() + summary.period.slice(1)} Report</h1>
<small>${summary.start} → ${summary.end}</small>

<div class="card">
<h2>Highlights</h2>
<ul>
  <li>Total tasks: <strong>${m.totalTasks || 0}</strong></li>
  <li>Completed: <strong>${m.totalCompleted || 0}</strong></li>
  <li>Avg completion time: <strong>${msToHuman(m.avgCompletionMs)}</strong></li>
  <li>Voice logs: <strong>${m.voiceLogs || 0}</strong></li>
  <li>Generated: <strong>${summary.generatedAt}</strong></li>
  <li>App: <strong>PlanCraftAI</strong></li>
  <li>Period: <strong>${summary.period}</strong></li>
  <li>Range: <strong>${summary.start} → ${summary.end}</strong></li>
  
</ul>
</div>

<div class="card">
<h2>Top Tags</h2>
<ul>${tagHtml || '<li>—</li>'}</ul>
</div>

<div class="card">
<h2>Mood Patterns</h2>
<ul>${moodHtml || '<li>—</li>'}</ul>
</div>

<p style="opacity:.8">Generated at ${summary.generatedAt}</p>
</body></html>`
}

export async function persistReport(uid, period, summary) {
  const ts = Date.now()
  const base = `reports/${uid}/${period}-${summary.start}-${summary.end}-${ts}`
  const jsonBuf = Buffer.from(JSON.stringify(summary, null, 2))
  const htmlBuf = Buffer.from(renderReportHtml(summary))
  const [jsonUrl, htmlUrl] = await Promise.all([
    uploadBufferToStorage(jsonBuf, `${base}.json`, 'application/json', true),
    uploadBufferToStorage(htmlBuf, `${base}.html`, 'text/html', true),
  ])
  const doc = {
    userId: uid,
    period,
    start: summary.start,
    end: summary.end,
    urls: { json: jsonUrl, html: htmlUrl },
    metrics: summary.metrics,
    createdAt: new Date(),
  }
  const ref = await db.collection('reports').add(doc)
  return { id: ref.id, ...doc }
}

// Optional PDF: tries to use puppeteer if installed. Returns URL or null.
export async function generateReportPDF(html, storageName) {
  try {
    const mod = await import('puppeteer')
    const puppeteer = mod?.default || mod
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })
    await browser.close()
    const url = await uploadBufferToStorage(pdfBuffer, `reports/${storageName}.pdf`, 'application/pdf', true)
    return url
  } catch (e) {
    console.warn('PDF generation skipped (puppeteer missing or failed):', e?.message || e)
    return null
  }
}
