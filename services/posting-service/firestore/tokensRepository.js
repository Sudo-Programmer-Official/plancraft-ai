import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'
import crypto from 'crypto'

const ENC_KEY = process.env.TOKEN_ENCRYPTION_KEY || ''
const ENC_ALGO = 'aes-256-gcm'

function hasEncryption() {
  return ENC_KEY && Buffer.from(ENC_KEY, 'base64').length === 32
}

function encryptPayload(obj) {
  if (!hasEncryption()) return obj
  const key = Buffer.from(ENC_KEY, 'base64')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv)
  const json = JSON.stringify(obj || {})
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    __encrypted: true,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  }
}

function decryptPayload(docData) {
  if (!docData?.__encrypted) return docData || {}
  try {
    if (!hasEncryption()) return {}
    const key = Buffer.from(ENC_KEY, 'base64')
    const iv = Buffer.from(docData.iv, 'base64')
    const tag = Buffer.from(docData.tag, 'base64')
    const enc = Buffer.from(docData.data, 'base64')
    const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    return JSON.parse(dec)
  } catch (err) {
    console.warn('[tokens] decrypt failed', err?.message || err)
    return {}
  }
}

async function readDoc(path) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db.doc(path).get()
  const data = snap.exists ? snap.data() : {}
  return decryptPayload(data)
}

async function writeDoc(path, payload) {
  ensureApp()
  const db = admin.firestore()
  const enc = encryptPayload(payload)
  await db.doc(path).set(enc, { merge: false })
}

export async function getTokensByUser(userId, workspaceId = null) {
  if (workspaceId) {
    return readDoc(`user_social_tokens/${userId}/workspaces/${workspaceId}`)
  }
  return readDoc(`user_social_tokens/${userId}`)
}

export async function saveUserTokens(userId, payload, workspaceId = null) {
  if (workspaceId) {
    return writeDoc(`user_social_tokens/${userId}/workspaces/${workspaceId}`, payload)
  }
  return writeDoc(`user_social_tokens/${userId}`, payload)
}
