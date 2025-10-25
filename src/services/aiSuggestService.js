import { db } from '../../server/firebaseAdmin.js'

function computeScore(template) {
  const usage = Number(template.usageCount || 0)
  const recencyDate = template.lastUsedAt?.toDate?.() || template.lastUsedAt || null
  const recencyMs = recencyDate ? Math.max(0, Date.now() - new Date(recencyDate).getTime()) : null
  const recencyScore = recencyMs != null ? Math.max(0, 1_000_000 - recencyMs) : 0
  return usage * 1000 + recencyScore
}

export async function getTemplateSuggestions({ orgId, limit = 5, filters = {} }) {
  if (!orgId) throw new Error('Missing orgId')
  let ref = db.collection(`orgs/${orgId}/templates`)
  if (filters.type) {
    ref = ref.where('type', '==', filters.type)
  }
  if (filters.industry) {
    ref = ref.where('industry', '==', filters.industry)
  }

  const snap = await ref.get()
  const templates = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const ranked = templates
    .map((tpl) => ({ template: tpl, score: computeScore(tpl) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ template }) => template)
  return ranked
}

export default {
  getTemplateSuggestions,
}
