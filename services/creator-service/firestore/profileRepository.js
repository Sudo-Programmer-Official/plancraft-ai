import { creatorRoot, serverTs, sanitizeForFirestore } from '../utils/db.js'

export function defaultProfile(workspaceId = 'default') {
  return {
    workspaceId,
    platforms: [],
    goals: { hiring: false, brand: false, saas_growth: false, thought_leadership: false },
    tone: { technical: 0.5, bold: 0.5, story: 0.5 },
    topics: [],
    frequency: {
      linkedin: { perWeek: 0, windows: [] },
      twitter: { perWeek: 0, windows: [] },
      instagram: { perWeek: 0, windows: [] },
      youtube: { perWeek: 0, windows: [] },
    },
    doExamples: [],
    dontExamples: [],
    voice: { pov: 'founder', personaNote: '' },
    constraints: { avoidTopics: [], forbiddenPhrases: [], complianceNotes: '' },
    autopilot: { enabled: false, autoApprove: false, pauseOnDrop: true },
    analytics: { tz: null, preferredTimes: [], lastFeedbackAt: null },
    createdAt: null,
    updatedAt: null,
  }
}

function profileDoc(uid, workspaceId = 'default') {
  const wsId = workspaceId || 'default'
  return creatorRoot(uid).collection('profile').doc(wsId)
}

export async function fetchProfile(uid, workspaceId = 'default') {
  const doc = await profileDoc(uid, workspaceId).get()
  if (!doc.exists) return { id: workspaceId, ...defaultProfile(workspaceId) }
  return { id: doc.id, workspaceId: doc.id, ...doc.data() }
}

export async function saveProfile(uid, payload = {}, workspaceId = 'default') {
  const ref = profileDoc(uid, workspaceId)
  const now = serverTs()
  const data = sanitizeForFirestore({
    ...payload,
    workspaceId,
    updatedAt: now,
    createdAt: payload.createdAt || now,
  })
  await ref.set(data, { merge: true })
  const snap = await ref.get()
  return { id: snap.id, workspaceId: snap.id, ...snap.data() }
}
