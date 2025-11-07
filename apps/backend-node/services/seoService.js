import fetch from 'node-fetch'
import { db } from './firebaseAdmin.js'
import { getMarketingRoutes, getRestrictedPaths } from '../../../shared/seo/routes.js'
import { buildSitemapXml, buildRobotsTxt } from '../../../shared/seo/generator.js'

const DEFAULT_BASE = 'https://plancraftai.com'
const BASE_URL = (process.env.PUBLIC_WEB_ORIGIN && String(process.env.PUBLIC_WEB_ORIGIN)) || DEFAULT_BASE
const NORMALIZED_BASE = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL

async function collectBlogRoutes() {
  try {
    const ref = db.collection('blogs')
    let snap
    try {
      snap = await ref.where('published', '==', true).orderBy('updated_at', 'desc').limit(200).get()
    } catch {
      snap = await ref.get()
    }
    return snap.docs
      .map((doc) => {
        const data = doc.data() || {}
        const slug = data.slug || doc.id
        if (!slug) return null
        return {
          path: `/blog/${slug}`,
          lastmod: (data.updated_at?.toDate?.() || data.updated_at || new Date()).toISOString().slice(0, 10),
          changefreq: 'weekly',
          priority: 0.82,
        }
      })
      .filter(Boolean)
  } catch (err) {
    console.warn('[SEO] Failed to collect blog routes', err?.message || err)
    return []
  }
}

export async function buildSitemapRoutes() {
  const marketingRoutes = getMarketingRoutes()
  const blogRoutes = await collectBlogRoutes()
  return [...marketingRoutes, ...blogRoutes]
}

export async function generateSitemapDocument() {
  const routes = await buildSitemapRoutes()
  const xml = buildSitemapXml({ baseUrl: NORMALIZED_BASE, routes })
  console.info('[SEO] sitemap generated', { total: routes.length })
  return xml
}

export function generateRobotsDocument() {
  const allowPaths = getMarketingRoutes().map((r) => r.path)
  const disallowPaths = getRestrictedPaths()
  return buildRobotsTxt({
    allowPaths,
    disallowPaths,
    sitemapUrl: `${NORMALIZED_BASE}/sitemap.xml`,
  })
}

export async function pingSearchEngines(sitemapUrl = `${NORMALIZED_BASE}/sitemap.xml`) {
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ]
  const results = []
  for (const url of targets) {
    try {
      const res = await fetch(url)
      results.push({ url, status: res.status })
      console.info('[SEO] ping result', { url, status: res.status })
    } catch (err) {
      results.push({ url, error: err?.message || String(err) })
      console.warn('[SEO] ping failed', { url, error: err?.message || err })
    }
  }
  return results
}

export function getSitemapBaseUrl() {
  return NORMALIZED_BASE
}
