import { proxyAi } from '../services/aiClient.js'
import { fetchProfile } from '../firestore/profileRepository.js'
import { createVariant } from '../firestore/variantsRepository.js'
import { findActiveCampaign, saveCampaign } from '../firestore/campaignRepository.js'
import { startRun, completeRun } from '../firestore/autopilotRunsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

function targetDraftCount(profile = {}) {
  const freq = profile.frequency || {}
  const total =
    (freq.linkedin?.perWeek || 0) +
    (freq.twitter?.perWeek || 0) +
    (freq.instagram?.perWeek || 0) +
    (freq.youtube?.perWeek || 0)
  const fallback = 3
  return Math.max(fallback, Math.min(total || fallback, 8))
}

function normalizeIdeas(raw = [], count = 3) {
  const ideas = []
  if (Array.isArray(raw)) {
    raw.forEach((item, idx) => {
      const title =
        item?.title ||
        item?.idea ||
        (typeof item === 'string' ? item : null) ||
        `Idea ${idx + 1}`
      const summary = item?.summary || item?.description || (typeof item === 'string' ? item : '') || ''
      ideas.push({
        id: item?.id || null,
        title,
        summary,
        topic: item?.topic || null,
      })
    })
  }
  if (!ideas.length) {
    for (let i = 0; i < count; i++) {
      ideas.push({ id: null, title: `Fresh idea ${i + 1}`, summary: '' })
    }
  }
  return ideas.slice(0, count)
}

function extractContent(result = {}) {
  return (
    result?.body ||
    result?.content ||
    result?.text ||
    result?.post ||
    result?.linkedin_post ||
    result?.output ||
    ''
  )
}

function extractHook(result = {}) {
  if (typeof result === 'string') return result
  if (Array.isArray(result?.hooks) && result.hooks.length) return result.hooks[0]
  return result?.hook || null
}

async function ensureCampaign(userId, workspaceId) {
  const existing = await findActiveCampaign({ userId, workspaceId })
  if (existing) return existing
  const now = new Date()
  const end = new Date(now)
  end.setDate(now.getDate() + 14)
  return await saveCampaign(null, {
    name: 'General Presence',
    summary: 'Auto-created by Autopilot',
    coreIdea: 'Maintain consistent presence',
    startDate: now,
    endDate: end,
    status: 'active',
    primaryPlatform: 'linkedin',
    secondaryPlatforms: [],
    workspaceId,
    userId,
  }, { userId, workspaceId })
}

export async function runAutopilotDrafts(req, res, next) {
  const generated = []
  const skipped = []
  let run = null
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const profile = await fetchProfile(userId, wsId || 'default')
    const campaign = await ensureCampaign(userId, wsId)

    run = await startRun({ userId, workspaceId: wsId, campaignId: campaign?.id || null, profile })

    const draftCount = targetDraftCount(profile)
    let ideas = []
    try {
      const ideaRes = await proxyAi('ideas', { profile, campaign, workspaceId: wsId })
      const ideaList = ideaRes?.ideas || ideaRes?.items || ideaRes?.data || ideaRes
      ideas = normalizeIdeas(ideaList, draftCount)
    } catch (err) {
      skipped.push(`idea_generation_failed: ${err?.message || 'unknown error'}`)
      ideas = normalizeIdeas([], draftCount)
    }

    for (const idea of ideas) {
      try {
        let hookText = idea.hook || null
        if (!hookText) {
          try {
            const hookRes = await proxyAi('hook', {
              idea: idea.title || idea.summary,
              profile,
              campaign,
              workspaceId: wsId,
            })
            hookText = extractHook(hookRes)
          } catch {}
        }

        const draftRes = await proxyAi('linkedin_post', {
          idea: idea.title || idea.summary,
          summary: idea.summary,
          hook: hookText,
          profile,
          campaign,
          workspaceId: wsId,
          context: { source: 'autopilot', campaignId: campaign?.id || null },
        })
        const body = extractContent(draftRes)
        const variant = await createVariant(userId, {
          platform: 'linkedin',
          type: 'post',
          title: idea.title || 'LinkedIn post',
          hook: hookText,
          body,
          status: 'draft',
          sourceId: idea.id || null,
          aiMeta: {
            autopilot: true,
            campaignId: campaign?.id || null,
            profileSnapshot: profile,
            idea,
            mode: 'draft-only',
          },
          workspaceId: wsId || null,
        })
        generated.push(variant.id)
      } catch (err) {
        skipped.push(`draft_failed: ${err?.message || 'unknown error'}`)
      }
    }

    const summary = {
      success: true,
      campaignId: campaign?.id || null,
      draftsCreated: generated.length,
      variants: generated,
      notes: ['LinkedIn only', 'Autopilot v0 (draft-only)'],
      skippedReasons: skipped,
    }
    if (run?.id) await completeRun(run.id, { generatedVariantIds: generated, skippedReasons: skipped })
    res.json(summary)
  } catch (err) {
    if (run?.id) await completeRun(run.id, { skippedReasons: [...skipped, err?.message || 'run_failed'] })
    next(err)
  }
}
