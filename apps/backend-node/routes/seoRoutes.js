import express from 'express'
import crypto from 'crypto'
import { generateSitemapDocument, generateRobotsDocument, pingSearchEngines, getSitemapBaseUrl } from '../services/seoService.js'

const router = express.Router()

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await generateSitemapDocument()
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return res.send(xml)
  } catch (err) {
    console.error('[SEO] Failed to build sitemap', err)
    return res.status(500).send('Unable to generate sitemap')
  }
})

router.get('/robots.txt', (_req, res) => {
  try {
    const robots = generateRobotsDocument()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.send(robots)
  } catch (err) {
    console.error('[SEO] Failed to build robots', err)
    return res.status(500).send('Unable to generate robots')
  }
})

router.post('/api/seo/ping', async (req, res) => {
  try {
    // Fail closed: without a configured token the endpoint is disabled.
    const secret = String(process.env.SEO_PING_TOKEN || '')
    const provided = String(req.headers['x-seo-secret'] || '')
    const matches =
      secret.length > 0 &&
      provided.length === secret.length &&
      crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
    if (!matches) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    // Only ever ping our own sitemap; never forward a caller-supplied URL.
    const sitemapUrl = `${getSitemapBaseUrl()}/sitemap.xml`
    const results = await pingSearchEngines(sitemapUrl)
    return res.json({ success: true, sitemapUrl, results })
  } catch (err) {
    console.error('[SEO] Ping failed', err)
    return res.status(500).json({ success: false, error: err?.message || 'Ping failed' })
  }
})

export default router
