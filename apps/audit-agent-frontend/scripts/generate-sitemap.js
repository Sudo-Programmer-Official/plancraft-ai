#!/usr/bin/env node
// Generate a simple sitemap.xml after build
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

const SITE_URL = 'https://plancraftai.com'

const routes = [
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
  '/blog/voice-task-planner-benefits',
  '/privacy-policy',
  '/terms',
  '/contact'
]

const now = new Date().toISOString().slice(0, 10)

const urls = routes
  .map((p) => `  <url>\n    <loc>${SITE_URL}${p}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.7'}</priority>\n  </url>`) 
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

// Write to dist/sitemap.xml and mirror to public/sitemap.xml
const distDir = join(ROOT, 'dist')
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
writeFileSync(join(distDir, 'sitemap.xml'), xml)

const publicDir = join(ROOT, 'public')
try {
  writeFileSync(join(publicDir, 'sitemap.xml'), xml)
} catch (_) {
  // ignore if public missing
}

console.log('✅ sitemap.xml generated for', routes.length, 'routes')

