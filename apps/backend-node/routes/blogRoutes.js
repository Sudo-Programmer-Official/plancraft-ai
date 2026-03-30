import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { generateDailyBlogIdea, generateBlogContent, generateBlogImage, generateBlogSummary, scoreBlogDraft } from '../services/blogAIService.js'
import requireAdmin from '../middleware/requireAdmin.js'

const router = express.Router()
router.use(requireAdmin)

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split(/[,#]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildEnhancementPrompt(field, blog, value) {
  const rawValue = Array.isArray(value) ? value.join(', ') : value
  const safeValue = String(rawValue || '(empty)')
  const title = String(blog?.title || 'PlanCraftAI blog')
  const focusKeyword = String(blog?.focusKeyword || blog?.title || 'AI task planner')

  const fieldPrompts = {
    title: `Rewrite this blog title for search intent and click-through rate.
Keyword: "${focusKeyword}".
Return only one title under 70 characters.`,
    seoTitle: `Write an SEO title for this blog.
Keyword: "${focusKeyword}".
Return only one SEO title under 60 characters.`,
    metaDescription: `Write a meta description for this blog.
Keyword: "${focusKeyword}".
Return only one sentence under 155 characters.`,
    summary: `Improve this blog summary.
Keyword: "${focusKeyword}".
Return only a crisp teaser under 160 characters.`,
    tags: `Turn this into 4 to 8 SEO-friendly tags for the blog "${title}".
Keyword: "${focusKeyword}".
Return only a comma-separated list.`,
    focusKeyword: `Suggest one better primary SEO keyword for the blog "${title}".
Return only the keyword phrase.`,
    content: `Improve this HTML blog post for clarity, structure, and SEO.
Keep it in HTML.
Make sure it stays useful, concrete, and naturally mentions PlanCraftAI.`,
  }

  const instruction =
    fieldPrompts[field] ||
    `Improve the following ${field} for a blog about "${title}".
Return only the improved ${field}, without any commentary.`

  return `${instruction}

Current value:
${safeValue}`
}

function serializeQuality(score = {}) {
  return {
    qualityScore: Number(score?.score || 0),
    qualityReady: !!score?.readyToPublish,
    qualityWordCount: Number(score?.wordCount || 0),
    qualityKeywordDensity: Number(score?.keywordDensity || 0),
    qualityChecks: Array.isArray(score?.checks) ? score.checks : [],
  }
}

// POST /api/blogs/idea -> creates a draft idea
router.post('/idea', async (req, res) => {
  try {
    const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword : ''
    const draft = await generateDailyBlogIdea(keyword)
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

    const out = await generateBlogContent(blog, {
      blogPrompt: settings.blogPrompt,
      aiModel: settings.aiModel,
    })
    const content = out?.contentHtml || out?.text || ''
    const model = out?.model
    const patch = {
      content,
      summary: out?.summary || blog.summary || '',
      seoTitle: out?.seoTitle || blog.seoTitle || blog.title || '',
      metaDescription: out?.metaDescription || blog.metaDescription || blog.summary || '',
      focusKeyword: out?.focusKeyword || blog.focusKeyword || '',
      tags: Array.isArray(out?.tags) ? out.tags : normalizeTags(blog.tags),
      faqItems: Array.isArray(out?.faqItems) ? out.faqItems : Array.isArray(blog.faqItems) ? blog.faqItems : [],
      internalLinks: Array.isArray(out?.internalLinks)
        ? out.internalLinks
        : Array.isArray(blog.internalLinks)
          ? blog.internalLinks
          : [],
      updated_at: new Date(),
    }
    const quality = serializeQuality(scoreBlogDraft({ ...blog, ...patch }))
    await db.collection('blogs').doc(id).set({ ...patch, ...quality }, { merge: true })
    res.json({ success: true, ...patch, ...quality, model })
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
    let url = await generateBlogImage(blog)
    // Normalize any accidental ".png.json" (or jpg/jpeg) suffixes
    if (typeof url === 'string') {
      url = url.replace(/\.(png|jpg|jpeg)\.json(\b|$)/i, '.$1')
    }
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

    const prompt = buildEnhancementPrompt(field, blog, value)

    let settings = {}
    try {
      const s = await db.collection('settings').doc('global').get()
      settings = s.exists ? (s.data() || {}) : {}
    } catch {}

    const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY })
    const resp = await openai.chat.completions.create({
      model: settings.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    })
    const enhanced = resp.choices?.[0]?.message?.content?.trim()
    const normalizedEnhanced = field === 'tags' ? normalizeTags(enhanced) : enhanced
    await db.collection('blogs').doc(req.params.id).set({ [field]: normalizedEnhanced, updated_at: new Date() }, { merge: true })
    res.json({ success: true, enhanced: normalizedEnhanced })
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

router.post('/:id/score', async (req, res) => {
  try {
    const id = String(req.params.id)
    const snap = await db.collection('blogs').doc(id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Not found' })
    const blog = snap.data() || {}
    const quality = serializeQuality(scoreBlogDraft(blog))
    await db.collection('blogs').doc(id).set({ ...quality, updated_at: new Date() }, { merge: true })
    return res.json({ success: true, ...quality })
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || 'Failed to score blog' })
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
    const quality = serializeQuality(scoreBlogDraft(before))
    if (!quality.qualityReady) {
      return res.status(400).json({
        success: false,
        error: 'Blog score is below publish threshold',
        ...quality,
      })
    }
    await ref.set({ ...patch, ...quality }, { merge: true })

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
          silent: true, // do not broadcast via PWA/email — admin feed only
        })
        announced = true
      } catch (e) {
        console.warn('Failed to create publish notification', e?.message || e)
      }
    }

    return res.json({ success: true, notified: announced, ...quality })
  } catch (e) {
    console.error('Publish error:', e)
    return res.status(500).json({ success: false, error: e?.message || 'Publish failed' })
  }
})

export default router
