const DEFAULT_BASE = 'https://plancraftai.com'

function normalizePath(path = '') {
  if (!path) return '/'
  if (path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function sanitizeBase(base = DEFAULT_BASE) {
  if (!base) return DEFAULT_BASE
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function buildSitemapXml({ baseUrl = DEFAULT_BASE, routes = [], defaultChangeFreq = 'weekly' } = {}) {
  const origin = sanitizeBase(baseUrl)
  const today = new Date().toISOString().slice(0, 10)
  const deduped = new Map()

  routes.forEach((route) => {
    if (!route || !route.path) return
    const key = normalizePath(route.path)
    deduped.set(key, {
      path: key,
      changefreq: route.changefreq || defaultChangeFreq,
      priority: typeof route.priority === 'number' ? route.priority.toFixed(2) : route.priority || '0.70',
      lastmod: route.lastmod || today,
    })
  })

  const entries = Array.from(deduped.values())
  const urls = entries
    .map(
      (item) => `  <url>
    <loc>${origin}${item.path}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

export function buildRobotsTxt({
  allowPaths = ['/'],
  disallowPaths = [],
  sitemapUrl = `${DEFAULT_BASE}/sitemap.xml`,
  crawlDelay,
} = {}) {
  const allow = Array.from(new Set(allowPaths.map((p) => normalizePath(p))))
  const disallow = Array.from(
    new Set(
      disallowPaths
        .map((p) => normalizePath(p))
        .filter((p) => !allow.includes(p) || p === '/'),
    ),
  )

  const lines = ['User-agent: *', '']
  allow.forEach((path) => lines.push(`Allow: ${path}`))
  if (disallow.length) {
    lines.push('')
    disallow.forEach((path) => lines.push(`Disallow: ${path}`))
  }
  if (crawlDelay) {
    lines.push('', `Crawl-delay: ${crawlDelay}`)
  }
  lines.push('', `Sitemap: ${sitemapUrl}`)
  return lines.join('\n')
}
