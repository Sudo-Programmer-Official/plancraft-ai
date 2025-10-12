import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { generateDailyBlogIdea, generateBlogContent, generateBlogImage } from '../services/blogAIService.js'

const router = express.Router()

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
    const content = await generateBlogContent(blog.title, blog.summary)
    await db.collection('blogs').doc(id).set({ ...blog, content, updated_at: new Date() }, { merge: true })
    res.json({ success: true, content })
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

export default router

