import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { generateDailyBlogIdea, generateBlogContent, generateBlogImage, generateBlogSummary } from '../services/blogAIService.js'
import requireAdmin from '../middleware/requireAdmin.js'

const router = express.Router()
router.use(requireAdmin)

// POST /api/blogs/idea -> creates a draft idea
router.post('/idea', async (req, res) => {
  try {
    const draft = await generateDailyBlogIdea()
    res.json({ success: true, draft })
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to generate idea' })
  }
})

// POST /api/blogs/:id/content -> generates content and updates doc
router.post('/:id/content', async (req, res) => {
  try {
    const id = String(req.params.id)
    const snap = await db.collection('blogs').doc(id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Not found' })
    const blog = snap.data()

    // Pull generation preferences from global settings
    let settings = {}
    try {
      const s = await db.collection('settings').doc('global').get()
      settings = s.exists ? (s.data() || {}) : {}
    } catch {}

    const out = await generateBlogContent(blog.title, blog.summary, {
      blogPrompt: settings.blogPrompt,
      aiModel: settings.aiModel,
    })
    const content = typeof out === 'string' ? out : out?.text || ''
    const model = typeof out === 'object' ? out?.model : undefined
    await db.collection('blogs').doc(id).set({ ...blog, content, updated_at: new Date() }, { merge: true })
    res.json({ success: true, content, model })
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to generate content' })
  }
})

// POST /api/blogs/:id/image -> generates and sets cover image URL
router.post('/:id/image', async (req, res) => {
  try {
    const id = String(req.params.id)
    const snap = await db.collection('blogs').doc(id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Not found' })
    const blog = snap.data()
    const url = await generateBlogImage(blog.title)
    await db.collection('blogs').doc(id).set({ coverImage: url, updated_at: new Date() }, { merge: true })
    res.json({ success: true, coverImage: url })
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to generate image' })
  }
})

// POST /api/blogs/:id/enhance
router.post('/:id/enhance', async (req, res) => {
  try {
    const { field, value } = req.body
    if (!field) return res.status(400).json({ success: false, error: 'Field missing' })
    const snap = await db.collection('blogs').doc(req.params.id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Blog not found' })
    const blog = snap.data()

    const prompt = `Improve the following ${field} for a blog about "${blog.title}":
    ${value || '(empty)'}.
    Return only the improved ${field}, without any commentary.`

    const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY })
    const resp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    })
    const enhanced = resp.choices?.[0]?.message?.content?.trim()
    await db.collection('blogs').doc(req.params.id).set({ [field]: enhanced, updated_at: new Date() }, { merge: true })
    res.json({ success: true, enhanced })
  } catch (e) {
    console.error('Enhancement error:', e)
    res.status(500).json({ success: false, error: e?.message || 'Enhancement failed' })
  }
})

// POST /api/blogs/:id/summarize -> generates one-sentence tagline and updates doc
router.post('/:id/summarize', async (req, res) => {
  try {
    const id = String(req.params.id)
    const snap = await db.collection('blogs').doc(id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Not found' })
    const blog = snap.data() || {}
    let settings = {}
    try {
      const s = await db.collection('settings').doc('global').get()
      settings = s.exists ? (s.data() || {}) : {}
    } catch {}
    const out = await generateBlogSummary(blog.title, blog.content || blog.summary, { aiModel: settings.aiModel })
    const summary = typeof out === 'string' ? out : out?.text || ''
    const model = typeof out === 'object' ? out?.model : undefined
    await db.collection('blogs').doc(id).set({ summary, updated_at: new Date() }, { merge: true })
    res.json({ success: true, summary, model })
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Failed to generate summary' })
  }
})

// POST /api/blogs/:id/publish -> set published true and create announcement
router.post('/:id/publish', async (req, res) => {
  try {
    const id = String(req.params.id)
    const ref = db.collection('blogs').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Not found' })

    const before = snap.data() || {}
    const alreadyPublished = !!before.published

    const patch = { published: true, updated_at: new Date() }
    await ref.set(patch, { merge: true })

    // Respect global settings toggle for notifications
    let allowNotify = true
    try {
      const setSnap = await db.collection('settings').doc('global').get()
      if (setSnap.exists) allowNotify = !!(setSnap.data() || {}).enableNotifications
    } catch {}

    let announced = false
    if (!alreadyPublished && allowNotify) {
      const blog = { ...before, ...patch }
      const origin = process.env.PUBLIC_WEB_ORIGIN || 'https://plancraftai.com'
      const link = `${origin.replace(/\/$/, '')}/blog/${blog.slug || id}`
      try {
        const now = new Date()
        await db.collection('notifications').add({
          type: 'blog',
          title: blog.title || 'New Blog',
          link,
          createdAt: now,
          date: now,
        })
        announced = true
      } catch (e) {
        console.warn('Failed to create publish notification', e?.message || e)
      }
    }

    return res.json({ success: true, notified: announced })
  } catch (e) {
    console.error('Publish error:', e)
    return res.status(500).json({ success: false, error: e?.message || 'Publish failed' })
  }
})

export default router
