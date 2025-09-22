Perfect 👍 Let’s build a detailed CodeX pipeline guide for your project so tasks are broken down into developer-friendly steps that slot right into your existing stack (Vue3 frontend + Node backend + Firebase).

⸻

📌 CodeX Pipeline Guide — PlanCraftAI

⸻

1. Plan My Day (Chat-Like Flow)

Frontend
	•	Create src/views/PlanDay.vue
	•	UI: chat-style Q&A
	•	Flow:
	1.	Show bot prompt: “What’s on your mind today?”
	2.	Capture user input (text/voice → backend).
	3.	Display AI-generated task list (reuse ✅ /split-tasks).
	4.	Buttons: Save to Tasks | Edit before Save.
	•	Use existing voice recorder logic (from VoiceRecorder.vue) → direct transcription into PlanDay input.

Backend
	•	Extend /split-tasks:
	•	Accept context="plan-day".
	•	Generate tasks with emoji + duration.
	•	Example response:

{
  "tasks": [
    { "title": "📝 Review slides", "details": "30 mins", "priority": 1 },
    { "title": "💻 Project meeting", "details": "3 PM", "priority": 2 },
    { "title": "🏋 Workout", "details": "45 mins", "priority": 3 }
  ]
}



Firestore
	•	On Save: insert tasks into tasks collection with date=today.

⸻

2. Reminders & Notifications

Firestore
	•	Create new reminders collection:

{
  userId,
  taskId,
  message,
  dueAt: timestamp,
  delivered: false
}



Backend
	•	Add /reminders API:
	•	POST /reminders → create reminder
	•	GET /reminders → list reminders (filter by userId)
	•	PATCH /reminders/:id → mark delivered

Notification Engine
	•	Start simple:
	•	Use Firebase Cloud Functions (cron) to poll reminders every 1m.
	•	Send notification:
	•	In-app → Firestore listener
	•	Email → Firebase functions + SendGrid
	•	SMS → Twilio (premium)

⸻

3. Reflections & Insights

Frontend
	•	Create src/views/Reflections.vue:
	•	Simple form: textarea → saves to reflections collection.
	•	Display all reflections in card view (date + content).
	•	Add tab in Dashboard → “My Reflections”.

Backend
	•	Extend AI service:
	•	/summarize-reflections → weekly summary
	•	Save AI insights into insights collection.

Firestore
	•	Collections:
	•	reflections: { userId, date, text }
	•	insights: { userId, week, summary }

⸻

4. Guest Mode Improvements

Pinia Store (authStore.js)
	•	Add getter:

isGuest: (state) => state.user?.isAnonymous === true



Frontend
	•	Use <GuestBanner> globally on Dashboard & Journal pages.
	•	Prevent saving reminders/insights in guest mode → show banner urging login.

⸻

5. Legal Pages

Frontend
	•	Already scaffolded: Privacy.vue, Terms.vue, Contact.vue.
	•	Add routes in router/index.js.
	•	Footer links:
	•	Privacy → /privacy
	•	Terms → /terms
	•	Contact → /contact

Contact Page
	•	✅ Form already integrated.
	•	Save form submissions into contacts Firestore collection.

⸻

6. Premium Features Pipeline

Phase 1
	•	SMS/email reminders → enable only for premium.
	•	“Call me for reminder” → integrate Twilio (CallYogi microservice).

Phase 2
	•	Export weekly summary PDF/email → $ upgrade.

Phase 3
	•	Shared workspace for teams/family → Pro plan.

⸻

7. Cost Optimization
	•	✅ Render Node.js stays on $7 dyno until traffic scales.
	•	✅ Firebase free tier for Auth, Firestore.
	•	⚠️ Twilio/SendGrid usage → gated behind premium.
	•	Logs (Render + Firebase console) → monitor before scaling.

⸻

🔄 Flow Recap
	1.	User says “Plan my day” → voice/text → /split-tasks.
	2.	AI generates tasks → confirm → save to tasks.
	3.	User adds reminders → saved to reminders.
	4.	Firebase job delivers notification (in-app/email/SMS).
	5.	Reflections saved → AI generates weekly insights → show on Dashboard.
	6.	Guest users get banner until login.
	7.	Legal pages live → adds credibility.

⸻

👉 This guide gives CodeX step-by-step dev tickets: which file to touch, which collection to add, which backend route to extend.
👉 We can now break this down into individual Jira/GitHub issues for smooth execution.

⸻

Do you want me to split this guide into ready-to-assign CodeX tasks (like “Frontend: build PlanDay.vue”, “Backend: extend reminders API”)? That way your team can just pick tasks off the board.