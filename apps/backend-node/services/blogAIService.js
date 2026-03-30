import OpenAI from 'openai'
import dotenv from "dotenv";
dotenv.config();
import { db, uploadBufferToStorage } from './firebaseAdmin.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const PUBLIC_WEB_ORIGIN = String(process.env.PUBLIC_WEB_ORIGIN || 'https://plancraftai.com').replace(/\/$/, '')

const INTERNAL_LINK_RULES = [
  {
    path: '/ai-task-planner',
    anchorText: 'AI task planner',
    keywords: ['ai task planner', 'task planner', 'task manager', 'task list', 'voice task', 'task workflow'],
  },
  {
    path: '/ai-daily-planner',
    anchorText: 'AI daily planner',
    keywords: ['ai daily planner', 'daily planner', 'daily planning', 'plan your day', 'day planning', 'daily schedule'],
  },
  {
    path: '/voice-reminder-app',
    anchorText: 'voice reminder app',
    keywords: ['voice reminder', 'spoken reminder', 'voice note reminder', 'reminder app', 'speak reminder'],
  },
  {
    path: '/recurring-reminder-app',
    anchorText: 'recurring reminder app',
    keywords: ['recurring reminder', 'repeating reminder', 'weekly reminder', 'daily reminder', 'follow-up reminder'],
  },
  {
    path: '/google-calendar-integration',
    anchorText: 'Google Calendar integration',
    keywords: ['google calendar', 'calendar sync', 'calendar integration', 'meeting planning', 'calendar workflow'],
  },
  {
    path: '/ai-reminders',
    anchorText: 'AI reminders',
    keywords: ['ai reminders', 'smart reminders', 'follow-up workflow', 'reminder workflow'],
  },
]

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanText(value = '', maxLength = 0) {
  const text = String(value || '')
    .replace(/```(?:json|html)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!maxLength || text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFocusKeyword(keyword = '', title = '') {
  const direct = cleanText(keyword, 90)
  if (direct) return direct
  const cleanedTitle = cleanText(title)
    .replace(/\((19|20)\d{2}\s+guide\)/i, '')
    .replace(/^how to use\s+/i, '')
    .replace(/^the best\s+/i, '')
    .trim()
  return cleanedTitle || 'AI task planner'
}

function sanitizeTags(rawTags, fallback = []) {
  const tags = Array.isArray(rawTags)
    ? rawTags
    : String(rawTags || '')
        .split(/[,#]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)

  const merged = [...tags, ...fallback]
    .map((tag) => cleanText(tag, 40))
    .filter(Boolean)

  return [...new Set(merged)].slice(0, 8)
}

function sanitizeFaqItems(rawFaqItems) {
  if (!Array.isArray(rawFaqItems)) return []
  return rawFaqItems
    .map((item) => ({
      question: cleanText(item?.question || item?.q || '', 120),
      answer: cleanText(item?.answer || item?.a || '', 320),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 5)
}

function extractJsonObject(raw = '') {
  const text = String(raw || '').trim()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {}

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    return JSON.parse(match[0])
  } catch {
    return {}
  }
}

async function listRecentBlogTitles(limit = 12) {
  try {
    const snap = await db.collection('blogs').limit(limit).get()
    return snap.docs
      .map((doc) => cleanText(doc.data()?.title || '', 90))
      .filter(Boolean)
      .slice(0, limit)
  } catch (err) {
    console.warn('[blogAI] Failed to load recent blog titles', err?.message || err)
    return []
  }
}

function pickInternalLinks(focusKeyword = '', title = '') {
  const haystack = `${focusKeyword} ${title}`.toLowerCase()
  const primary =
    INTERNAL_LINK_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword))) ||
    INTERNAL_LINK_RULES[0]

  return [
    {
      path: '/',
      href: `${PUBLIC_WEB_ORIGIN}/`,
      anchorText: 'PlanCraftAI',
      label: 'PlanCraftAI homepage',
    },
    {
      path: primary.path,
      href: `${PUBLIC_WEB_ORIGIN}${primary.path}`,
      anchorText: primary.anchorText,
      label: primary.anchorText,
    },
  ]
}

function sanitizeGeneratedHtml(content = '') {
  const text = String(content || '')
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim()

  if (!text) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text
      .replace(/\n{2,}/g, '\n')
      .replace(/\s+(<\/(p|h2|h3|ul|ol|li|blockquote)>)/gi, '$1')
      .trim()
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => cleanText(paragraph))
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('')
}

function ensureInternalLinksInContent(contentHtml = '', internalLinks = []) {
  if (!contentHtml || !internalLinks.length) return contentHtml

  const missingLinks = internalLinks.filter((link) => !contentHtml.includes(link.href))
  if (!missingLinks.length) return contentHtml

  const linkMarkup = missingLinks
    .map((link, index) => {
      const prefix = index === 0 ? 'Explore ' : ' and '
      return `${prefix}<a href="${link.href}">${link.anchorText}</a>`
    })
    .join('')

  return `${contentHtml}<p>${linkMarkup} to keep building a calmer, more reliable planning workflow.</p>`
}

function ensureComparisonSection(contentHtml = '', focusKeyword = '') {
  if (!contentHtml) return contentHtml
  if (/<h2[^>]*>[^<]*(vs|versus|comparison|alternatives)/i.test(contentHtml)) return contentHtml
  const keyword = cleanText(focusKeyword) || 'AI planners'
  return `${contentHtml}
<h2>${keyword} vs traditional task apps</h2>
<p>Traditional task apps are good at storing tasks, but they still depend on you to translate ideas into a plan manually. ${keyword} workflows can shorten that gap by turning raw notes, meetings, and spoken reminders into an organized next step faster.</p>
<p>That matters most when the day changes quickly. PlanCraftAI combines capture, planning, reminders, and calendar context in one place, which makes it easier to follow through than stitching together separate tools.</p>`
}

function ensureSoftMidArticleCta(contentHtml = '', internalLinks = []) {
  if (!contentHtml || internalLinks.length < 2) return contentHtml
  if (/explore\s+<a href="https:\/\/plancraftai\.com\/|try\s+<a href="https:\/\/plancraftai\.com\//i.test(contentHtml)) {
    return contentHtml
  }

  const softCta = `<p>If you want to test this workflow while you read, explore <a href="${internalLinks[1].href}">${internalLinks[1].anchorText}</a> and see how PlanCraftAI turns planning into follow-through.</p>`
  const paragraphs = contentHtml.match(/<p[\s\S]*?<\/p>/gi) || []
  if (paragraphs.length < 3) return `${contentHtml}${softCta}`

  const insertionTarget = paragraphs[2]
  const index = contentHtml.indexOf(insertionTarget)
  if (index === -1) return `${contentHtml}${softCta}`
  const insertionPoint = index + insertionTarget.length
  return `${contentHtml.slice(0, insertionPoint)}${softCta}${contentHtml.slice(insertionPoint)}`
}

function appendFaqSection(contentHtml = '', faqItems = []) {
  if (!faqItems.length) return contentHtml
  if (/<h2[^>]*>\s*faq\s*<\/h2>/i.test(contentHtml)) return contentHtml
  const faqMarkup = faqItems
    .map((item) => `<h3>${item.question}</h3><p>${item.answer}</p>`)
    .join('')
  return `${contentHtml}<h2>FAQ</h2>${faqMarkup}`
}

function ensureEndCta(contentHtml = '', internalLinks = []) {
  if (!contentHtml || internalLinks.length < 2) return contentHtml
  const tail = stripHtml(contentHtml).slice(-400).toLowerCase()
  if (tail.includes('start planning') || tail.includes('try plancraftai') || tail.includes('ready to')) {
    return contentHtml
  }

  return `${contentHtml}<p>Ready to make this easier in practice? Start with <a href="${internalLinks[0].href}">PlanCraftAI</a> or go straight to the <a href="${internalLinks[1].href}">${internalLinks[1].anchorText}</a> page to build your workflow.</p>`
}

function extractHeadingTexts(contentHtml = '', tagName = 'h2') {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  const matches = []
  let match
  while ((match = regex.exec(contentHtml))) {
    matches.push(stripHtml(match[1]).toLowerCase())
  }
  return matches
}

function extractSiteLinks(contentHtml = '') {
  const links = []
  const regex = /href="([^"]+)"/gi
  let match
  while ((match = regex.exec(contentHtml))) {
    const href = String(match[1] || '').trim()
    if (href) links.push(href)
  }
  return links
}

function countKeywordOccurrences(text = '', keyword = '') {
  const safeKeyword = cleanText(keyword)
  if (!safeKeyword) return 0
  const regex = new RegExp(escapeRegExp(safeKeyword), 'gi')
  return (String(text || '').match(regex) || []).length
}

export function scoreBlogDraft(blog = {}) {
  const title = cleanText(blog?.title || '', 120)
  const focusKeyword = normalizeFocusKeyword(blog?.focusKeyword, title)
  const seoTitle = cleanText(blog?.seoTitle || title, 120)
  const metaDescription = cleanText(blog?.metaDescription || blog?.summary || '', 180)
  const contentHtml = String(blog?.contentHtml || blog?.content || '')
  const text = stripHtml(contentHtml)
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const introText = words.slice(0, 100).join(' ').toLowerCase()
  const h2Headings = extractHeadingTexts(contentHtml, 'h2')
  const actualLinks = extractSiteLinks(contentHtml)
  const storedLinks = Array.isArray(blog?.internalLinks) ? blog.internalLinks : []
  const siteLinks = [...actualLinks, ...storedLinks.map((item) => item?.href || '').filter(Boolean)]
  const keywordOccurrences = countKeywordOccurrences(text.toLowerCase(), focusKeyword.toLowerCase())
  const keywordDensity = wordCount ? Number(((keywordOccurrences / wordCount) * 100).toFixed(2)) : 0
  const faqItems = Array.isArray(blog?.faqItems) ? blog.faqItems : []
  const faqQuestions = faqItems.map((item) => cleanText(item?.question || '').toLowerCase())
  const comparisonPattern = /(vs\.?|versus|alternative|alternatives|compared to|comparison|traditional task apps?|other tools?|best tools?)/i
  const bestPattern = /\bbest\b/i
  const beginnerPattern = /(what is|how does|beginner|getting started)/i
  const examplePattern = /(for example|for instance|example workflow|example:|consider this|imagine you|say you)/i
  const homepageLinkPresent = siteLinks.some((link) => String(link || '').replace(/\/$/, '') === PUBLIC_WEB_ORIGIN)
  const seoLinkPresent = siteLinks.some((link) =>
    INTERNAL_LINK_RULES.some((rule) => rule.path !== '/' && String(link || '').includes(rule.path))
  )

  const checks = [
    {
      key: 'keyword_in_title',
      label: 'Keyword in title',
      passed: title.toLowerCase().includes(focusKeyword.toLowerCase()) || seoTitle.toLowerCase().includes(focusKeyword.toLowerCase()),
      points: 12,
    },
    {
      key: 'keyword_in_intro',
      label: 'Keyword in first 100 words',
      passed: introText.includes(focusKeyword.toLowerCase()),
      points: 12,
    },
    {
      key: 'keyword_in_h2s',
      label: 'Keyword in at least 3 H2 headings',
      passed: h2Headings.filter((heading) => heading.includes(focusKeyword.toLowerCase())).length >= 3,
      points: 12,
    },
    {
      key: 'word_count',
      label: 'Word count at least 900',
      passed: wordCount >= 900,
      points: 14,
    },
    {
      key: 'internal_links',
      label: 'Homepage + relevant SEO page linked',
      passed: homepageLinkPresent && seoLinkPresent,
      points: 14,
    },
    {
      key: 'faq_present',
      label: 'FAQ includes best/comparison/beginner intent',
      passed:
        faqItems.length >= 3 &&
        faqQuestions.some((question) => bestPattern.test(question)) &&
        faqQuestions.some((question) => comparisonPattern.test(question)) &&
        faqQuestions.some((question) => beginnerPattern.test(question)),
      points: 12,
    },
    {
      key: 'concrete_examples',
      label: 'Concrete examples included',
      passed: examplePattern.test(text) || /<ul|<ol|<blockquote/i.test(contentHtml),
      points: 12,
    },
    {
      key: 'comparison_section',
      label: 'Alternatives/comparison section present',
      passed: comparisonPattern.test(text) || comparisonPattern.test(h2Headings.join(' ')),
      points: 12,
    },
  ]

  const score = checks.reduce((total, check) => total + (check.passed ? check.points : 0), 0)

  return {
    score,
    readyToPublish: score >= 80,
    wordCount,
    keywordDensity,
    checks,
    seoTitle,
    metaDescription,
    focusKeyword,
  }
}

function buildFallbackSummary(summary = '', contentHtml = '') {
  const direct = cleanText(summary, 160)
  if (direct) return direct
  return cleanText(stripHtml(contentHtml), 160)
}

function parseStructuredBlogPayload(raw, fallback = {}) {
  const parsed = extractJsonObject(raw)
  const focusKeyword = normalizeFocusKeyword(parsed?.focusKeyword, fallback.focusKeyword || fallback.title)
  const title = cleanText(parsed?.title || fallback.title, 80) || 'How to Use AI for Daily Planning (2026 Guide)'
  const seoTitle = cleanText(parsed?.seoTitle || title, 68)
  const contentHtml = sanitizeGeneratedHtml(parsed?.contentHtml || parsed?.content || parsed?.html || '')
  const summary = buildFallbackSummary(parsed?.summary || fallback.summary, contentHtml)
  const metaDescription = cleanText(parsed?.metaDescription || summary, 160)
  const tags = sanitizeTags(parsed?.tags, [focusKeyword, 'PlanCraftAI'])
  const faqItems = sanitizeFaqItems(parsed?.faqItems)
  const internalLinks = pickInternalLinks(focusKeyword, title)

  const contentWithLinks = ensureInternalLinksInContent(contentHtml, internalLinks)
  const contentWithComparison = ensureComparisonSection(contentWithLinks, focusKeyword)
  const contentWithSoftCta = ensureSoftMidArticleCta(contentWithComparison, internalLinks)
  const contentWithFaq = appendFaqSection(contentWithSoftCta, faqItems)
  const finalContent = ensureEndCta(contentWithFaq, internalLinks)

  return {
    title,
    seoTitle,
    summary,
    metaDescription,
    focusKeyword,
    tags,
    faqItems,
    internalLinks,
    contentHtml: finalContent,
  }
}

export async function generateDailyBlogIdea(keyword = '') {
  const focusKeyword = normalizeFocusKeyword(keyword)
  const recentTitles = await listRecentBlogTitles()
  const recentTitlesBlock = recentTitles.length
    ? `Recent PlanCraftAI blog titles to avoid duplicating:
- ${recentTitles.join('\n- ')}`
    : ''
  const prompt = `You are PlanCraftAI’s content strategist.
Create one SEO-ready blog draft for the keyword "${focusKeyword || 'AI task planner'}".

Return strict JSON with keys:
- focusKeyword
- title
- seoTitle
- summary
- metaDescription
- tags (array)

Rules:
- Focus on search intent, not abstract branding language.
- Title should feel rankable, concrete, and human, for example "How to Use AI for Daily Planning (2026 Guide)".
- Summary should be a crisp 1-2 sentence hook.
- Meta description must be under 160 characters.
- Tags should be relevant search terms, not hashtags.
- Keep the topic close to PlanCraftAI use cases: AI task planner, AI daily planner, voice reminders, recurring reminders, Google Calendar workflows.

Additional rules:
- The keyword must appear naturally in the title.
- Avoid generic topics like "The future of AI".
- Prefer actionable, problem-solving topics such as how, best, vs, or guide.
- Ensure the topic can rank for a specific Google search query.
- Avoid duplicate angles already common unless improved with a unique angle.
${recentTitlesBlock ? `\n${recentTitlesBlock}` : ''}`

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  })

  const idea = JSON.parse(res.choices?.[0]?.message?.content || '{}')
  const normalizedKeyword = normalizeFocusKeyword(idea?.focusKeyword, focusKeyword || idea?.title)
  const title = cleanText(idea?.title || `How to Use ${normalizedKeyword} (2026 Guide)`, 80)
  const seoTitle = cleanText(idea?.seoTitle || title, 68)
  const summary = cleanText(idea?.summary, 180)
  const metaDescription = cleanText(idea?.metaDescription || summary, 160)
  const tags = sanitizeTags(idea?.tags, [normalizedKeyword, 'PlanCraftAI'])
  const internalLinks = pickInternalLinks(normalizedKeyword, title)
  const slug = slugify(title || 'post')

  const doc = {
    title: String(title || 'Untitled'),
    seoTitle,
    summary,
    metaDescription,
    focusKeyword: normalizedKeyword,
    tags,
    slug,
    content: '',
    faqItems: [],
    internalLinks,
    created_at: new Date(),
    updated_at: new Date(),
    published: false,
    author: 'PlanCraftAI',
  }

  const ref = await db.collection('blogs').add(doc)
  return { id: ref.id, ...doc }
}

export async function generateBlogContent(blog = {}, opts = {}) {
  const blogPrompt = (opts?.blogPrompt || '').trim();
  const preferredModel = (opts?.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  const title = cleanText(blog?.title, 80) || 'How to Use AI for Daily Planning (2026 Guide)'
  const focusKeyword = normalizeFocusKeyword(blog?.focusKeyword, title)
  const summary = cleanText(blog?.summary, 180)
  const internalLinks = pickInternalLinks(focusKeyword, title)
  const internalLinkInstructions = internalLinks
    .map((link) => `- ${link.href} with natural anchor text similar to "${link.anchorText}"`)
    .join('\n')
  const prompt = `You are PlanCraftAI’s SEO blog writer and product marketer.

Write a high-value article for the focus keyword "${focusKeyword}".

Article context:
- Working title: "${title}"
- Current summary: "${summary || 'N/A'}"
- Brand: PlanCraftAI
- Product positioning: AI task planner, AI daily planner, voice reminder app, recurring reminders, and Google Calendar workflows.

Return strict JSON with keys:
- title
- seoTitle
- summary
- metaDescription
- tags (array)
- faqItems (array of { question, answer })
- contentHtml

Mandatory rules:
- contentHtml must be clean HTML only, never markdown.
- Aim for 900-1300 words of genuinely useful content.
- Open with a concrete problem-led intro, not fluff.
- Use this section structure with real headings:
  1. What is ${focusKeyword}?
  2. Why traditional planning fails
  3. How PlanCraftAI helps
  4. How to use ${focusKeyword} step by step
  5. Best practices
  6. Alternatives and comparisons
  7. FAQ
- Mention PlanCraftAI naturally 2-4 times. Do not keyword-stuff.
- Include one example workflow and one realistic caution/best-practice list.
- Include exactly 2 internal links:
  1. One to https://plancraftai.com/
  2. One to a relevant SEO page such as /ai-task-planner or /voice-reminder-app
- Anchor text must be natural and keyword-relevant, never "click here".
- Add exactly these two internal links in the article body:
${internalLinkInstructions}
- Avoid generic AI filler, broad philosophical intros, cartoonish metaphors, and vague claims.
- Meta description must be under 160 characters.
- FAQ should have 3 to 5 high-intent questions.

SEO enforcement rules:
- Use the focus keyword in:
  - H1 (title)
  - first 100 words
  - at least 3 H2 headings
- Maintain natural keyword density of roughly 1% to 1.5%.
- Include at least one comparison or alternative mention such as traditional apps vs AI planners.
- Include one best tools or options style paragraph even if PlanCraftAI is primary.
- Ensure each section answers a real user query clearly.

Content quality rules:
- Avoid generic intros like "In today's fast-paced world".
- Every paragraph must provide concrete value, not filler.
- Prefer short paragraphs of 2 to 4 lines.
- Use bullet points where helpful.

Conversion rules:
- Include one soft CTA mid-article.
- Include one clear CTA at the end.
- Emphasize what PlanCraftAI does better than manual planning or generic task apps.
- Explain why a reader would choose PlanCraftAI over patching together multiple tools.

FAQ rules:
- FAQ should include:
  - at least one best query
  - one comparison query
  - one beginner query

Additional editorial policy:
"${blogPrompt || 'Prioritize concrete search intent, clear examples, and natural product mentions.'}"`

  const models = [...new Set([preferredModel, 'gpt-4o-mini', 'gpt-4o'])];
  let lastErr = null;

  for (const model of models) {
    try {
      const res = await openai.chat.completions.create({
        model,
        temperature: 0.55,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      });

      const text = res.choices?.[0]?.message?.content?.trim() || '';
      const parsed = parseStructuredBlogPayload(text, {
        title,
        summary,
        focusKeyword,
      })

      if (parsed.contentHtml) return { ...parsed, model };
    } catch (e) {
      lastErr = e;
      console.warn(`[generateBlogContent] Model '${model}' failed:`, e?.message || e);
      continue;
    }
  }

  if (lastErr) throw lastErr;
  return { contentHtml: '', model: models[0] };
}

export async function generateBlogSummary(title = '', content = '', opts = {}) {
  const safeTitle = String(title || '').slice(0, 180)
  const safeContent = String(content || '').slice(0, 2000)
  const prompt = `You are PlanCraftAI’s blog editor.
Write a single-sentence tagline (max 160 characters) for the blog titled "${safeTitle}".
Tone: crisp, clear, motivational. No quotes. Return only the sentence.

Context (optional):
${safeContent}
`

  const preferredModel = (opts?.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  const models = [preferredModel, 'gpt-4o-mini', 'gpt-3.5-turbo']
  let lastErr = null
  for (const model of models) {
    try {
      const res = await openai.chat.completions.create({
        model,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = res.choices?.[0]?.message?.content?.trim() || ''
      if (text) return { text, model }
    } catch (e) {
      lastErr = e
      console.warn(`[generateBlogSummary] Model '${model}' failed:`, e?.message || e)
      continue
    }
  }
  if (lastErr) throw lastErr
  return { text: '', model: models[0] }
}

// export async function generateBlogImage(title) {
//   const prompt = `
// Create a soft, calming illustration in the visual style of the PlanCraftAI app
// (theme: deep indigo gradients, productivity, mindfulness, and focus).
// Include abstract icons that reflect journaling, planning, or creativity.
// Aspect ratio 16:9, minimal text, consistent with a calm professional tone.
// Title: "${blog.title || 'PlanCraftAI Blog'}"
// `
//   const image = await openai.images.generate({
//     model: 'dall-e-3',
//     prompt: prompt.trim(),
//     size: '1024x1024'
//   })
//   return image.data?.[0]?.url || ''
// }
export async function generateBlogImage(blog = {}) {
  try {
    const title = cleanText(blog?.title || 'PlanCraftAI Blog', 80)
    const slug = slugify(blog?.slug || title)
    const focusKeyword = normalizeFocusKeyword(blog?.focusKeyword, title)
    const summary = cleanText(blog?.summary, 180)
    const prompt = `
Create a realistic editorial cover image for a SaaS productivity blog post.
Topic: "${focusKeyword}"
Supporting context: "${summary || title}"
Brand: PlanCraftAI.

Art direction:
- Photorealistic or realistic editorial photography style.
- Show a believable workspace, laptop, phone, calendar, reminder, or planning workflow.
- Subtle indigo accents are okay, but no fantasy lighting.
- High trust, modern, clean, and usable as a blog hero image.
- No text overlay, no logos, no UI mockup text, no cartoon illustration.
- Avoid painted look, abstract AI blobs, glowing brains, surreal effects, and fake 3D renders.
- Use real-world lighting, camera lens depth, and natural shadows.
- Avoid symmetry-perfect or artificial compositions.
- Scene should look like a real photographed workspace, not generated art.
- Include subtle human presence cues such as hands, coffee, or a notebook, but no faces are required.
- Aspect ratio 16:9.
`;

    const image = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
      prompt: prompt.trim(),
      size: "1792x1024",
      response_format: 'b64_json',
      n: 1,
    });

    const b64 = image?.data?.[0]?.b64_json
    if (!b64) {
      // Fallback to URL if b64 not provided
      const url = image?.data?.[0]?.url
      if (url) return url
      throw new Error('No image returned from OpenAI')
    }
    const buffer = Buffer.from(b64, 'base64')
    const safeSlug = slug || 'post'
    const filename = `blog_covers/${safeSlug}-${Date.now()}.png`
    const publicUrl = await uploadBufferToStorage(buffer, filename, 'image/png', true)
    return publicUrl
  } catch (err) {
    console.error("❌ generateBlogImage error:", err);
    throw new Error(err?.message || "Failed to generate image");
  }
}
