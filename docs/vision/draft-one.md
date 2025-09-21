Got it 👍 you’re wrapping up V1 and already thinking ahead into V2 (premium edition). Let’s split this into two parts:

⸻

🔧 Fix for the current UI bug

The left sidebar “Journal” section rising up is usually caused by a missing container h-full or mismatched flex/overflow rules. Quick fix:

<aside class="h-screen flex flex-col bg-gradient-to-b from-slate-900 to-indigo-950">
  <nav class="flex-1">
    <!-- menu items here -->
  </nav>
</aside>

Add h-screen to the sidebar container so it always stretches full height, aligning with the content.

⸻

🚀 V2 Premium Ideas

Core “Voice-First Productivity”
	1.	Smart Day Planner (AI learns habits):
	•	If user says “plan my day,” app pulls past tasks + completion history → generates a suggested daily schedule.
	•	Example: “You usually run in the morning, code in the afternoon, and journal at night. Here’s a plan for today.”
	2.	Reminders (push + call + SMS):
	•	Scheduled reminders (ex: 9 AM daily summary).
	•	Voice call from assistant: “Hi Abhishek, don’t forget your presentation at 11 AM.”
	•	Optional SMS/WhatsApp integration.
	3.	Priority Detection:
	•	AI looks at tasks and labels them: 🔥 Urgent, 💡 Deep Work, 🌿 Quick Wins.
	•	Push urgent items proactively.
	4.	Offline Quick Capture (voice memos → tasks):
	•	Even without full internet, record tasks → syncs later.
	•	Great for joggers, commuters, or low-connectivity.

⸻

Business Model 💰
	•	Free tier: Journaling, daily/weekly/monthly views, voice-to-task basics.
	•	Premium ($5–10/mo range):
	•	AI “Plan My Day” generator.
	•	Personalized reminders (push + call).
	•	Deeper analytics: completion rates, productivity streaks.
	•	Export → PDF/Notion/Google Calendar sync.

Benchmark: apps like Headspace, Notion AI, Todoist Premium are $5–12/mo. If you bundle voice calls + habit AI, you can justify $7.99–9.99/mo.

⸻

V2 Launch Strategy
	1.	Collect beta feedback from current testers (“what would make you pay for this?”).
	2.	Pitch voice-call assistant as your killer feature (most apps only do push).
	3.	Start with monthly + annual pricing (discount annual by ~20%).

⸻

👉 Suggestion: In V1.1, add a small banner: “✨ Want an AI that calls you when it’s time? Coming soon in V2.” → lets you gauge interest before coding.

⸻

Do you want me to draft a V2 feature roadmap doc (tech + pricing) so we can keep it in the /docs folder alongside the V1 handbook?