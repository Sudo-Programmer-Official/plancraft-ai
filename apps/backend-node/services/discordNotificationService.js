import nodeFetch from 'node-fetch'
import { db } from './firebaseAdmin.js'

const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : nodeFetch
const DISCORD_API = 'https://discord.com/api/v10'

async function fetchUserDiscord(userId) {
  if (!userId) return null
  const snap = await db.collection('users').doc(String(userId)).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  return data?.integrations?.discord || null
}

async function postJson(url, token, body) {
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Discord API error ${resp.status}: ${text}`)
  }
  return await resp.json()
}

async function sendToChannel(botToken, channelId, content) {
  return postJson(`${DISCORD_API}/channels/${channelId}/messages`, botToken, { content })
}

async function sendDm(botToken, discordUserId, content) {
  // Create DM channel then send
  const dmChannel = await postJson(`${DISCORD_API}/users/@me/channels`, botToken, {
    recipient_id: discordUserId,
  })
  if (!dmChannel?.id) throw new Error('Unable to create Discord DM channel')
  return sendToChannel(botToken, dmChannel.id, content)
}

export async function sendDiscordMessage({ userId, message, channelId = null, isDM = true } = {}) {
  const rawToken = process.env.DISCORD_BOT_TOKEN
  const botToken = rawToken ? String(rawToken).replace(/^Bot\s+/i, '') : null
  if (!botToken) throw new Error('DISCORD_BOT_TOKEN not configured')
  if (!message) throw new Error('Message required')

  const integ = await fetchUserDiscord(userId)
  if (!integ?.discordUserId) throw new Error('Discord not connected for this user')

  const targetChannel = channelId || integ.defaultChannelId || null
  const content = message.slice(0, 1900) // keep within Discord limits

  if (targetChannel && isDM === false) {
    return sendToChannel(botToken, targetChannel, content)
  }
  // Fallback to DM
  return sendDm(botToken, integ.discordUserId, content)
}

export default {
  sendDiscordMessage,
}
