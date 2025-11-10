🔥 Perfect — Phase 6 is where your marketing brain comes alive visually.
This is where PlanCraftAI starts producing image posts, story reels, and short clips with your brand voice — end-to-end automated.

Think:

“We just shipped Focus Mode 🧠 — here’s a 15-sec voice-over reel auto-generated from the announcement.”

Let’s define this clearly.

⸻

🎬 Phase 6 – Visual & Voice Content Generation (Images + Videos + Audio Narration)

Continue from Phase 5 (A/B testing + segmentation) in PlanCraft + marketing-agent.

Goal:
Enable the system to auto-generate visual creatives, short videos, and branded voice posts that match each campaign’s tone and platform.
The AI should:
1. Create still banners (LinkedIn/Twitter)
2. Generate vertical reels (Instagram/YouTube Shorts)
3. Add AI voice narration + background music
4. Post via the same marketing pipeline

---

# 🧩 1️⃣ Core Modules

### 1.1 `ai/visualGenerator.js`
Uses DALL·E 3 (or any connected image model).

```js
export async function generatePostImage({ headline, tone, platform }) {
  const prompt = `
  Create a clean ${platform}-style visual with text overlay:
  "${headline}"
  Style: ${tone} startup aesthetic, minimal colors, white background, readable text.
  `
  const image = await openai.images.generate({ model: "dall-e-3", prompt, size: "1024x1024" })
  return image.url
}

Outputs → stored in marketing_assets collection with metadata:

{
  "assetType": "image",
  "platform": "linkedin",
  "campaignId": "cmp_123",
  "url": "https://..."
}


⸻

1.2 ai/videoGenerator.js

Build 15–30 s short clips.

Flow:
	1.	Generate background image(s) with DALL·E.
	2.	Generate voice-over using ElevenLabs or OpenAI TTS v2.
	3.	Stitch using FFmpeg with background music.

import { exec } from "child_process"

export async function createPromoVideo({ headline, body, tone, voice="alloy" }) {
  const audioUrl = await generateVoiceOver(`${headline}. ${body}`, voice)
  const bgImg = await generatePostImage({ headline, tone, platform: "video" })
  const output = `/tmp/video_${Date.now()}.mp4`

  await exec(`ffmpeg -loop 1 -i ${bgImg} -i ${audioUrl} -shortest -c:v libx264 -c:a aac -b:a 192k ${output}`)
  return output
}


⸻

1.3 ai/voiceOver.js

export async function generateVoiceOver(text, voice="alloy") {
  const res = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text
  })
  return saveBufferToFirebase(res, "tts_outputs")
}


⸻

🎞 2️⃣ Asset Management & Storage

Create Firestore collection: marketing_assets
Fields:
	•	id, campaignId, type (“image” | “video” | “audio”)
	•	url, createdAt, platform, generatedBy, status

Integrate with existing marketing_campaigns documents (assetRefs).

⸻

🧠 3️⃣ AI Logic Integration

When a campaign is approved or auto-generated:
	1.	contentGenerator prepares text.
	2.	visualGenerator adds image.
	3.	videoGenerator creates 15 s clip.
	4.	Both assets linked in campaign doc.
	5.	A/B engine can test text-only vs visual vs video.

⸻

🧩 4️⃣ Admin UI Updates

In AdminMarketing.vue → new “Creatives” tab.

4.1 Asset Gallery

Grid view of latest visuals & videos.
Columns:
| Type | Platform | Preview | Linked Campaign | Created At | Actions |
Buttons: 🔍 View, 🔄 Regenerate, ⬇️ Download.

4.2 Campaign Preview

When viewing campaign drawer, show:
	•	Text preview
	•	Image preview (auto generated)
	•	Video player (if available)

4.3 Regenerate Dialog

Admin can tweak tone or tagline → click “Regenerate Visuals” → POST /api/marketing/assets/regenerate.

⸻

🧩 5️⃣ Backend Routes

apps/backend-node/routes/marketingAssetsRoutes.js
	•	POST /api/marketing/assets/generate
→ Body: { campaignId, type: "image"|"video", tone }
	•	GET /api/marketing/assets?campaignId=cmp_123
	•	POST /api/marketing/assets/regenerate
	•	DELETE /api/marketing/assets/:id

Auth: Admin only.

Each asset stored in Firebase Storage → URL recorded in Firestore.

⸻

🎧 6️⃣ Cross-Platform Publishing

Extend posting adapters:

Platform	Format	Notes
LinkedIn	image + text	use OpenGraph upload
Twitter	image or short video	via API v2 media
Instagram	reel upload	through Graph API / Meta Business SDK
Email	embedded image or video link	
WhatsApp	text + thumbnail image	

Add uploadAsset() helper in each platform adapter.

⸻

🧮 7️⃣ A/B Testing for Visuals

Extend marketing_variants:
	•	assetType
	•	assetUrl
	•	engagementDelta

Scheduler: compare image vs text vs video → log CTR differences.

⸻

📊 8️⃣ Insights Dashboard (Extension)

Add new card to AdminMarketing > Insights:

Visual Performance (last 30 days)
- Image posts CTR : 4.2 %
- Video posts CTR : 6.8 %
- Text-only : 2.9 %

Line chart with daily trend.
API → /api/marketing/insights?type=creatives.

⸻

⚙️ 9️⃣ Environment Variables

OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_TTS_MODEL=gpt-4o-mini-tts
FFMPEG_PATH=/usr/bin/ffmpeg
ASSET_STORAGE_BUCKET=plancraft_marketing_assets
ENABLE_VIDEO_GENERATION=true


⸻

✅ Acceptance Checklist
	•	AI generates images + short videos for approved campaigns.
	•	Assets stored & visible in Admin UI.
	•	Videos include voice-over + music.
	•	A/B metrics tracked by asset type.
	•	Admin can preview and regenerate creatives.
	•	Works on LinkedIn, Twitter, Instagram adapters.

---

### 🧩 **Outcome**
Phase 6 = **full multimedia autonomy.**  
PlanCraft AI will:
- Write copy ✍️  
- Design visuals 🖼️  
- Narrate them with voice 🎙️  
- Post and analyze results 📈  

---

Would you like to proceed to **Phase 7 – “Community Engagement & Auto-Conversation”**, where the AI replies to comments, DMs, and discussions in your brand voice (while learning tone from your past replies)?