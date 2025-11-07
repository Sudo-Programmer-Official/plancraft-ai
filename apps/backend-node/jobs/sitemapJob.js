import cron from 'node-cron'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateSitemapDocument, generateRobotsDocument, pingSearchEngines, getSitemapBaseUrl } from '../services/seoService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_OUTPUT = path.resolve(__dirname, '../temp/seo')
const OUTPUT_DIR = process.env.SEO_OUTPUT_DIR || DEFAULT_OUTPUT

export function initSitemapJob() {
  const enabled = String(process.env.ENABLE_SITEMAP_JOB ?? '1').toLowerCase()
  const shouldRun = enabled === '1' || enabled === 'true' || enabled === 'on'
  if (!shouldRun) {
    console.log('[SEO] Sitemap job disabled (set ENABLE_SITEMAP_JOB=1 to enable)')
    return
  }
  scheduleRun('boot')
  cron.schedule('30 2 * * *', () => scheduleRun('cron'))
  console.log('[SEO] Sitemap cron scheduled (02:30 UTC daily)')
}

async function scheduleRun(trigger) {
  try {
    await runSitemapJob(trigger)
  } catch (err) {
    console.error('[SEO] Sitemap job failed', { trigger, error: err?.message || err })
  }
}

async function runSitemapJob(trigger) {
  const xml = await generateSitemapDocument()
  const robots = generateRobotsDocument()
  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'sitemap.xml'), xml, 'utf8')
  await writeFile(path.join(OUTPUT_DIR, 'robots.txt'), robots, 'utf8')
  console.info('[SEO] sitemap generated', { trigger, output: OUTPUT_DIR })
  const pingEnabled = String(process.env.SEO_PING_ON_WRITE ?? '1').toLowerCase()
  if (pingEnabled !== '0' && pingEnabled !== 'false' && pingEnabled !== 'off') {
    await pingSearchEngines(`${getSitemapBaseUrl()}/sitemap.xml`)
  }
}
