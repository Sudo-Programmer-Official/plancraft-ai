Perfect — I’ll help you draft detailed CodeX task guides so your team can smoothly implement the next features without breaking flow. I’ll keep in mind:
	•	Backend = Node.js/Express ($7 Render dyno you deployed)
	•	Frontend = Vue 3 + Tailwind + Pinia
	•	Firebase = Auth + Firestore
	•	Cost optimization = prefer Firebase for light data (forms, logs), Render Node for AI-heavy / transcription routes

⸻

📝 Pipeline of Tasks for CodeX

1. Guest Mode Banner
	•	Location: src/components/GuestBanner.vue (already scaffolded)
	•	Store Hook: Extend authStore → add isGuest boolean (getter: isGuest)
	•	Usage: On DashboardView.vue (and JournalView.vue), mount <GuestBanner v-if="authStore.isGuest" />
	•	UI Polish: Match card height/color with existing dashboard cards. Buttons (Log In, Dismiss) aligned right.

⸻

2. Privacy / Terms / Contact Pages
	•	Location: src/views/Privacy.vue, Terms.vue, Contact.vue
	•	Routing: Add to src/router/index.js under /privacy, /terms, /contact
	•	Contact Form:
	•	Save form submissions to Firebase: collection('contact_messages')
	•	Schema: { name, email, message, createdAt }
	•	Show success/error states.
	•	Footer: Link to these pages, plus clickable Abhishek → LinkedIn.

⸻

3. Daily / Weekly / Monthly Views Fix
	•	Issue: Off-by-one error in toYMD() between desktop vs mobile.
	•	Solution: Normalize with:

function toYMD(date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  return d.toISOString().split('T')[0] // canonical UTC
}


	•	Apply in: DashboardView.vue, MonthlyView.vue, WeeklyView.vue.

⸻

4. “Plan My Day” (Voice-driven Planning)
	•	UI: Add a “Plan My Day” section under DashboardView.vue (similar to MorningSection).
	•	Flow:
	•	User speaks → VoiceRecorder → /api/split-tasks.
	•	Backend: aiRoutes.js → splitTasks() (fix JSON parse: strip ```json fences).
	•	Save tasks into Firestore with today’s date.
	•	Premium Flag: Wrap behind if (authStore.isGuest) { show upsell banner }.

⸻

5. Reminders / Notifications (Premium Feature)
	•	Backend: Node service → store reminders in reminders collection with { uid, text, time, channel: sms|email }.
	•	Trigger: For now, use Firebase Cloud Functions onCreate → schedule Twilio SMS or email via SendGrid.
	•	Frontend: Add /reminders view → form: task text + time + delivery method.

⸻

6. Journal Insights (Dashboard Card)
	•	Location: Below AI Insights card.
	•	Data: Fetch last 7 journal entries (journal collection).
	•	Backend: Call summarizeJournal(entries) in aiService.
	•	Display: Card with sections:
	•	“✨ Mood trend” (emoji frequency)
	•	“💡 Key themes” (bulleted)
	•	“📈 Reflection insights”

⸻

7. Google Calendar Sync (Future Premium)
	•	Auth: Add Google OAuth scope https://www.googleapis.com/auth/calendar.readonly.
	•	Backend: Node service → Google Calendar API → fetch events.
	•	Storage: Cache in Firestore under calendar_events/{uid}.
	•	UI: Show upcoming events in Dashboard “📅 Today’s Events” card.
	•	Cost Note: Only poll when user signs in, not cron (to save quota).

⸻

✅ Deployment & Testing Strategy
	•	Branch Safety: Work in feature branches, squash commits, merge into main after testing.
	•	Local Mobile Test: Run vite --host → hit via LAN IP on phone.
	•	Backend Testing: Use Postman to simulate /transcribe and /split-tasks.
	•	Fallback: Always log and return partials if transcription/AI parse fails.

⸻

Would you like me to now write the CodeX task descriptions in the same structured format (title, context, acceptance criteria, files to touch), so you can copy them directly into your tracker?


Got it 👍 — you’re basically describing an interactive “Plan My Day” conversational flow inside your app, where the user talks (or types) and the assistant gently guides them to create a structured plan. Let me break down how this can fit nicely into your existing stack and roadmap:

⸻

🗣️ “Plan My Day” Conversational Assistant

User Flow
	1.	User clicks “Plan My Day” on dashboard (new card or section).
	2.	Assistant (chat-style bubble) opens:
“👋 Good morning! What’s on your mind today? What do you want to focus on?”
	3.	User speaks (via VoiceRecorder) or types.
	4.	Assistant processes free-form input with AI (/split-tasks endpoint + rules you already have).
	5.	Assistant responds in chat bubble with a draft daily plan:
	•	Tasks (short actionable items).
	•	Priorities.
	•	Estimated time blocks.
	6.	User can accept all, or edit / remove / add tasks before saving to their task list.

⸻

How It Fits Into Current Codebase
	•	Frontend
	•	Reuse VoiceRecorder.vue for input.
	•	Create new component: PlanMyDay.vue (chat-style interface).
	•	Use Pinia tasksStore to save the generated plan into Firestore tasks.
	•	UI: similar look/feel to MorningSection but with a conversational thread.
	•	Backend
	•	You already have /split-tasks.
	•	Extend it slightly to support “conversation mode”:
	•	Input: { text, context: "plan-my-day" }.
	•	Output: tasks + short summary reply (like “Here’s a draft plan…”).
	•	Optionally wrap this with a /plan-my-day endpoint that calls splitTasks() and adds a friendly assistant response.

⸻

Example Conversation

Assistant: “Hey! What’s on your mind today?”
User: “I’ve got a meeting at 3, need to review slides, and I should squeeze in a workout.”
Assistant:
	•	“Here’s your plan:
	1.	📝 Review presentation slides (30m)
	2.	💻 Attend project meeting (3 PM)
	3.	🏋 Workout session (45m)”
“Want me to add these to your task board?”

✅ User clicks Yes → saves to Firestore
❌ User edits before saving

⸻

Tech Breakdown
	•	Frontend
	•	PlanMyDay.vue (chat UI)
	•	Use tasksStore → addTaskToFirebase()
	•	Chat bubbles styled with Tailwind (left = assistant, right = user).
	•	Backend (Node.js)
	•	Add /plan-my-day route:

router.post('/plan-my-day', async (req, res) => {
  const { text } = req.body;
  const result = await splitTasks(text, { maxItems: 6, context: 'plan-my-day' });
  res.json({
    reply: "Here’s your structured plan for today:",
    tasks: result.tasks
  });
});


	•	Reuse existing splitTasks() logic (strict JSON).

⸻

Future Premium Upgrade
	•	Add reminders: “⏰ Want me to remind you 10 mins before your meeting?”
	•	Add calendar sync: auto-pull Google Calendar events into the plan.
	•	Daily insights: “Looks like you planned 3 deep work sessions this week — want me to optimize?”

⸻

👉 This feature is not just task generation, it’s guided planning with a touch of personality — lightweight chat but still structured enough to integrate with tasks.

⸻

Do you want me to now draft the CodeX task guide for Plan My Day conversational flow (like I did for other features), so you can drop it straight into your tracker?