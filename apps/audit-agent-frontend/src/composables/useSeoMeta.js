import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'

const SITE_URL = (import.meta?.env?.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com'
const BASE_URL = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL
const DEFAULT_IMAGE = `${BASE_URL}/plancraftai-post-one.png`

export function useSeoMeta(options = {}) {
  const route = useRoute()
  const {
    title = 'PlanCraft AI',
    description = 'PlanCraft AI blends AI task management, voice journaling, and reminders for peaceful productivity.',
    keywords = [],
    image = DEFAULT_IMAGE,
    type = 'website',
    canonical,
    canonicalPath,
    structuredData = [],
    noindex = false,
    pageLabel,
  } = options

  const canonicalUrl = canonical || `${BASE_URL}${canonicalPath || route?.fullPath || ''}`
  const keywordList = Array.isArray(keywords) ? keywords : typeof keywords === 'string' ? [keywords] : []
  const metaEntries = [
    { name: 'description', content: description },
    keywordList.length ? { name: 'keywords', content: keywordList.join(', ') } : null,
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:image', content: image },
    { property: 'og:site_name', content: 'PlanCraft AI' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:site', content: '@PlanCraftAI' },
    noindex ? { name: 'robots', content: 'noindex, nofollow' } : null,
  ].filter(Boolean)

  const scripts = (structuredData || [])
    .filter(Boolean)
    .map((schema) => ({
      type: 'application/ld+json',
      children: JSON.stringify(schema),
    }))

  useHead({
    title,
    meta: metaEntries,
    link: canonicalUrl
      ? [
          {
            rel: 'canonical',
            href: canonicalUrl,
          },
        ]
      : [],
    script: scripts,
  })

  const label = pageLabel || route?.name || title
  try {
    console.info('[SEO] meta optimized', { page: label, url: canonicalUrl })
    if (scripts.length) {
      console.info('[SEO] structured data injected', { page: label, blocks: scripts.length })
    }
  } catch {}
}
