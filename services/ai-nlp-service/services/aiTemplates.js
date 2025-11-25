export const HOOK_TEMPLATE = `You are an expert copywriter. Write a compelling hook that captures attention in under 20 words. Focus on clarity, immediacy, and a clear payoff.`

export const REPURPOSE_TEMPLATE = `Repurpose the provided content into platform-ready snippets. Provide concise, actionable outputs that respect the channel's tone.`

export const REEL_SCRIPT_TEMPLATE = `Create a short-form reel script with: Intro hook, 3-5 body beats, and a clear CTA. Keep it energetic and punchy.`

export const STORY_FRAME_TEMPLATE = `Create story frames. Return 3-5 frames, each with 1-2 short lines, optionally a note for overlay, and a CTA on the last frame.`

export const LINKEDIN_POST_TEMPLATE = `Write a LinkedIn post with a professional but warm tone. Include a hook, a concise narrative, and a practical takeaway or CTA.`

export const TWEET_THREAD_TEMPLATE = `Write a tweet thread of 5-8 tweets. Start with a strong hook, keep tweets scannable, and close with a CTA or question.`

export const OUTREACH_TEMPLATE = `Write a concise outreach/investor message. Include a one-line value prop, a proof point, and a specific next step.`

export const EXTRACT_EVENT_TEMPLATE = `Extract structured event details from the provided text. Return a concise JSON object with:
{
  "title": "",
  "date": "",
  "time": "",
  "timezone": "",
  "venue": "",
  "address": "",
  "lat": "",
  "lng": "",
  "attendees": [],
  "notes": ""
}
If a field is unknown, return an empty string. Keep titles short.`
