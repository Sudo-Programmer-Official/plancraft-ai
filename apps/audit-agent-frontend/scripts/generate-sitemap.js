#!/usr/bin/env node
/**
 * PlanCraftAI — Sitemap Generator
 * ---------------------------------
 * Dynamically generates sitemap.xml with all static + blog routes
 * after build (for SEO indexing on Firebase Hosting / Vite / Netlify)
 */
/* eslint-env node */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import https from 'https'
import process from 'process'

// Firebase SDK (for dynamic blog URLs)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

// 🔹 Resolve project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// 🔹 Site base URL
const SITE_URL = 'https://plancraftai.com'

// 🔹 Firebase config (only needs projectId for read access)
const firebaseConfig = {
  projectId: 'plancraftai', // ⚠️ Make sure this matches your Firebase project
}

// Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 🔹 Fetch blog slugs from Firestore
async function getBlogSlugs() {
  try {
    const snap = await getDocs(collection(db, 'blogs'))
    const slugs = snap.docs
      .map((d) => d.data()?.slug)
      .filter(Boolean)
      .map((slug) => `/blog/${slug}`)
    console.log(`📝 Found ${slugs.length} blog posts`)
    return slugs
  } catch (err) {
    console.warn('⚠️ Failed to fetch blog slugs:', err.message)
    return []
  }
}

// 🔹 Generate sitemap XML
async function generateSitemap() {
  const blogRoutes = await getBlogSlugs()

  const staticRoutes = [
    '/',
    '/dashboard',
    '/daily',
    '/weekly',
    '/monthly',
    '/journal',
    '/today',
    '/planner',
    '/timeline',
    '/blog',
    '/privacy-policy',
    '/terms',
    '/contact',
  ]

  const routes = [...staticRoutes, ...blogRoutes]

  const now = new Date().toISOString().slice(0, 10)

  const urls = routes
    .map((p) => {
      const priority = p === '/' ? '1.0' : p.startsWith('/blog/') ? '0.8' : '0.7'
      return `  <url>
    <loc>${SITE_URL}${p}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>
`

  // Write to dist/sitemap.xml
  const distDir = join(ROOT, 'dist')
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
  writeFileSync(join(distDir, 'sitemap.xml'), xml)

  // Mirror to public/sitemap.xml (for Firebase hosting)
  const publicDir = join(ROOT, 'public')
  try {
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })
    writeFileSync(join(publicDir, 'sitemap.xml'), xml)
  } catch (err) {
    console.warn('⚠️ Could not write to /public:', err.message)
  }

  console.log(`✅ sitemap.xml generated for ${routes.length} routes`)
  pingSearchEngines()
}

// 🔹 Optional: Notify Google & Bing
function pingSearchEngines() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ]

  for (const ping of pingUrls) {
    https.get(ping, (res) => {
      console.log(`📡 Pinged ${ping.split('/')[2]} (${res.statusCode})`)
    }).on('error', (err) => {
      console.warn('Ping error:', err.message)
    })
  }
}

// 🔹 Run main function
/* eslint-env node */
generateSitemap().catch((e) => {
  console.error('❌ Sitemap generation failed:', e)
  process.exit(1)
})