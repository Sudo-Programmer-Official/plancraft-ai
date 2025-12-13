import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

function collection() {
  ensureApp()
  return admin.firestore().collection('media_assets')
}

export async function saveGeneratedAssets({ workspaceId = null, userId = null, prompt, style, aspect, platform, postId = null, images = [] }) {
  if (!images.length) return []
  const batch = admin.firestore().batch()
  const now = new Date()
  const out = []
  images.forEach((img) => {
    const ref = collection().doc()
    const doc = {
      workspaceId: workspaceId || null,
      createdBy: userId || 'unknown',
      source: 'ai',
      provider: img.provider || 'openai',
      prompt: prompt || null,
      style: style || null,
      aspect: aspect || null,
      platform: platform || null,
      urls: [img.url].filter(Boolean),
      width: img.width || null,
      height: img.height || null,
      seed: img.seed || null,
      postId: postId || null,
      createdAt: now,
      updatedAt: now,
    }
    batch.set(ref, doc)
    out.push({ id: ref.id, ...doc })
  })
  await batch.commit()
  return out
}
