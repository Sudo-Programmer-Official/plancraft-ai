🚀 Phase 4 – “Auto-Promote” Integration

Continue from the existing PlanCraft + marketing-agent setup.

Goal:
Let any part of PlanCraft (e.g., TalkToPlanner, TaskPlannerDialog, or admin dashboard) trigger marketing actions such as:
- “Announce this feature”
- “Share my productivity insights”
- “Generate a weekly progress recap and post it”

All routed through the marketing-agent and approved/logged in the Marketing Command Center.

---

# 🧩 1️⃣ Backend Bridge — `/api/promote`

In `apps/backend-node/routes/promoteRoutes.js`, create new endpoints that connect PlanCraft core → marketing-agent.

## POST /api/promote/feature
Payload:
```json
{
  "title": "New Smart Reminder System",
  "description": "Now PlanCraft automatically schedules your tasks using AI insights.",
  "platforms": ["linkedin", "twitter", "email"],
  "tone": "motivational",
  "autoPublish": false
}

Flow:
	1.	Validate auth.
	2.	Call marketing-agent /api/ai/generate → create post for each platform.
	3.	Store campaign in Firestore marketing_campaigns with status: "pending_approval" unless autoPublish true.
	4.	Return { campaignId, preview, status }.

POST /api/promote/weekly-summary

Triggered by cron or manual click.

Fetch user analytics (completed tasks, goals, etc.) and call marketing-agent /api/ai/generate with a prompt like:

“Summarize this week’s productivity for PlanCraft users — highlight improvements and upcoming features.”

Then enqueue across selected channels.

GET /api/promote/status

Return recent auto-generated promotions with statuses (approved, posted, rejected).

⸻

🧱 2️⃣ Planner ↔ Marketing Hooks

In the planner’s backend (apps/backend-node/services/plannerService.js):

Add a helper triggerAutoPromotion(eventType, payload).

Example triggers:

Event	Auto-promotion idea
feature_launched	“Announce new feature”
weekly_summary	“Share community progress”
milestone_achieved	“Milestone post”

Each trigger calls /api/promote/feature internally with AI-generated content.

⸻

🎛 3️⃣ Frontend: “Promote” Button in Admin & TalkToPlanner

In AdminMarketing.vue

Add top-right button:

🔄 “Promote Feature”

Opens dialog:
	•	Title
	•	Description
	•	Platforms (multi-select)
	•	Tone (select)
	•	Auto-publish toggle

On “Generate”, call /api/promote/feature.
Preview appears below → admin can “Approve & Post”.

In TalkToPlanner

Add voice shortcut:

“Announce our new feature to LinkedIn”

→ triggers same API (through FastAPI endpoint or backend-node).

Show toast: “Got it! Preparing announcement draft…”

⸻

🧠 4️⃣ AI Prompt Logic (inside marketing-agent)

In ai/contentGenerator.js, add a new mode:

if (input.mode === "auto_promotion") {
  prompt = `
    Write a short social post announcing a new feature for PlanCraftAI.
    Feature: ${input.title}
    Description: ${input.description}
    Tone: ${input.tone}
    Make it sound authentic, founder-style, and platform-appropriate.
  `
}

Return per-platform variants (LinkedIn long, Twitter concise, Email friendly, WhatsApp chatty).

⸻

📊 5️⃣ Analytics & Reporting

Extend performanceAnalyzer.js to tag posts as "auto_promotion" and track:
	•	engagement vs manually-written posts
	•	CTR per platform for promotional content

Expose results under /api/marketing/insights?type=auto_promotion.

Display this in the AdminMarketing “Insights” tab.

⸻

⚙️ 6️⃣ Cron: Weekly Recap Bot

In marketing-agent scheduler/optimizer.js, add:

cron.schedule("0 9 * * MON", runWeeklyRecap)

runWeeklyRecap:
	•	Pulls last week’s tasks/goals via internal PlanCraft API.
	•	Generates “Week in Review” posts.
	•	Queues them for approval/posting.

⸻

🧩 7️⃣ Environment Variables

MARKETING_AGENT_URL=
PLANNER_INTERNAL_API_KEY=
AUTO_PROMOTE_ENABLED=true
AUTO_PROMOTE_APPROVAL_REQUIRED=true


⸻

✅ Acceptance Checklist
	•	/api/promote/feature works end-to-end → generates campaign visible in AdminMarketing.
	•	TalkToPlanner voice → “announce” triggers that endpoint.
	•	Weekly auto-promotion runs on Monday morning.
	•	Admin can approve/edit these posts before publishing.
	•	Performance metrics tagged and displayed under Insights tab.

---

### 💥 After Phase 4
You’ll have a **self-aware growth loop**:
- Planner activity → marketing-agent → social posts  
- Admin can approve or auto-publish  
- Performance feeds back into the AI’s tone & timing