import { db } from '@/firebase/init'
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag || '').trim()).filter(Boolean)
  return String(value || '')
    .split(/[,#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function normalizeFaqItems(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      question: String(item?.question || item?.q || '').trim(),
      answer: String(item?.answer || item?.a || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
}

function normalizeInternalLinks(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      path: String(item?.path || '').trim(),
      href: String(item?.href || '').trim(),
      anchorText: String(item?.anchorText || item?.label || '').trim(),
      label: String(item?.label || item?.anchorText || '').trim(),
    }))
    .filter((item) => item.path || item.href)
}

function normalizeBlogData(data = {}) {
  return {
    ...data,
    tags: normalizeTags(data?.tags),
    faqItems: normalizeFaqItems(data?.faqItems),
    internalLinks: normalizeInternalLinks(data?.internalLinks),
    focusKeyword: String(data?.focusKeyword || ''),
    seoTitle: String(data?.seoTitle || ''),
    metaDescription: String(data?.metaDescription || ''),
    qualityScore: Number(data?.qualityScore || 0),
    qualityReady: !!data?.qualityReady,
    qualityWordCount: Number(data?.qualityWordCount || 0),
    qualityKeywordDensity: Number(data?.qualityKeywordDensity || 0),
    qualityChecks: Array.isArray(data?.qualityChecks) ? data.qualityChecks : [],
  }
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug || 'post'
  let count = 0
  while (true) {
    const q = query(collection(db, 'blogs'), where('slug', '==', slug))
    const snap = await getDocs(q)
    if (snap.empty) return slug
    count += 1
    slug = `${baseSlug}-${count}`
  }
}

export async function createBlog(payload) {
  const title = String(payload?.title || 'Untitled')
  const baseSlug = slugify(payload?.slug || title)
  const slug = await ensureUniqueSlug(baseSlug)
  const ref = doc(collection(db, 'blogs'))
  const now = new Date()
  const data = {
    title,
    slug,
    summary: String(payload?.summary || ''),
    content: String(payload?.content || ''),
    tags: normalizeTags(payload?.tags),
    focusKeyword: String(payload?.focusKeyword || ''),
    seoTitle: String(payload?.seoTitle || ''),
    metaDescription: String(payload?.metaDescription || ''),
    faqItems: normalizeFaqItems(payload?.faqItems),
    internalLinks: normalizeInternalLinks(payload?.internalLinks),
    qualityScore: Number(payload?.qualityScore || 0),
    qualityReady: !!payload?.qualityReady,
    qualityWordCount: Number(payload?.qualityWordCount || 0),
    qualityKeywordDensity: Number(payload?.qualityKeywordDensity || 0),
    qualityChecks: Array.isArray(payload?.qualityChecks) ? payload.qualityChecks : [],
    created_at: Timestamp.fromDate(now),
    updated_at: Timestamp.fromDate(now),
    published: !!payload?.published,
    author: String(payload?.author || ''),
    coverImage: String(payload?.coverImage || ''),
  }
  await setDoc(ref, data)
  return { id: ref.id, ...data }
}

export async function updateBlog(id, changes) {
  const ref = doc(db, 'blogs', String(id))
  const patch = {
    ...changes,
    ...(Object.prototype.hasOwnProperty.call(changes || {}, 'tags') ? { tags: normalizeTags(changes?.tags) } : {}),
    ...(Object.prototype.hasOwnProperty.call(changes || {}, 'faqItems')
      ? { faqItems: normalizeFaqItems(changes?.faqItems) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(changes || {}, 'internalLinks')
      ? { internalLinks: normalizeInternalLinks(changes?.internalLinks) }
      : {}),
    updated_at: serverTimestamp(),
  }
  await updateDoc(ref, patch)
}

export async function deleteBlog(id) {
  await deleteDoc(doc(db, 'blogs', String(id)))
}

export async function publishBlog(id, flag = true) {
  await updateBlog(id, { published: !!flag })
}

export async function getBlogBySlug(slug, options = {}) {
  const { publishedOnly = true } = options
  const constraints = [where('slug', '==', String(slug))]
  if (publishedOnly) {
    constraints.push(where('published', '==', true))
  }
  const q = query(collection(db, 'blogs'), ...constraints)
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = normalizeBlogData(d.data())
  return { id: d.id, ...data }
}

export async function listBlogs(publishedOnly = false) {
  const q = publishedOnly
    ? query(collection(db, 'blogs'), where('published', '==', true), orderBy('created_at', 'desc'))
    : query(collection(db, 'blogs'), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...normalizeBlogData(d.data()) }))
}
