import { db } from '@/firebase/init'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
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
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
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
  const patch = { ...changes, updated_at: serverTimestamp() }
  await updateDoc(ref, patch)
}

export async function deleteBlog(id) {
  await deleteDoc(doc(db, 'blogs', String(id)))
}

export async function publishBlog(id, flag = true) {
  await updateBlog(id, { published: !!flag })
}

export async function getBlogBySlug(slug) {
  const q = query(collection(db, 'blogs'), where('slug', '==', String(slug)))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function listBlogs(publishedOnly = false) {
  const q = publishedOnly
    ? query(collection(db, 'blogs'), where('published', '==', true), orderBy('created_at', 'desc'))
    : query(collection(db, 'blogs'), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

