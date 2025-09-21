🚀 AuditAgent – V2 Feature Plan

1. Morning Recorder Flow (Auto-Prompt)
	•	On app launch (especially morning time, or first time user-  based on user’s timezone), show a “Plan Your Day” recorder page immediately.
	•	Simple interface:
	•	Big mic button (“Start Recording”).
	•	Once stopped → show loading indicator while transcription + AI task parsing runs.
	•	After processing → auto-fill into “Daily Tasks” page.
	•	First-time experience should feel like: wake up → open app → speak → tasks appear.
  . in the mic background it would be space shooting star like we did earlier to calm people in the very first thing in the morning, very pleasant ui.
  . use morning section and for the exisitn gfucntionality so that we can reuse all fun ctinality nicely while having new chnages as well.

⸻

2. Global Voice Recording UX Improvements
	•	Everywhere voice input exists:
	•	Add a loading / processing state (spinner, animated dots, or waveform shimmer).
	•	Show “Processing your voice…” or similar to reassure users.
	•	Replace instantly once text is ready.
	•	Avoids the “half sentence shows / stuck waiting” confusion.

⸻

3. Reminders & Nudges
	•	Daily reminders:
	•	Users can configure preferred time (e.g., 9AM).
	•	Assistant sends a notification (Phase 1: push notification; Phase 2: SMS / phone call).
	•	Call feature (premium):
	•	Assistant makes a voice call to remind about important tasks (“Don’t forget your meeting at 2 PM”).
	•	Twilio or WebRTC for outbound calls.

⸻

4. Smart Suggestions (Patterns)
	•	System looks at past entries + tasks.
	•	If user says “plan my day” but doesn’t give details:
	•	Auto-generate a suggested daily plan from historical behavior + goals.
	•	Example:
	•	If they often run in the morning → “Run for 20 mins.”
	•	If they journal at night → “Reflect for 5 mins before bed.”

⸻

5. Goals & Progress (Premium Tier)
	•	Users can set goals (weekly or monthly).
	•	Example: “Read 3 books this month.”
	•	Dashboard shows:
	•	Progress tracking.
	•	Nudges like “You’ve completed 2/3 books, keep going!”
	•	Encourages long-term stickiness.

⸻

6. Dashboard Enhancements
	•	Patterns & insights:
	•	“You usually finish most tasks by noon.”
	•	“You skipped journaling 2 days in a row.”
	•	Quick stats:
	•	Weekly completion %.
	•	Average mood trend.
	•	Premium features highlighted (reminders, calls, advanced analytics).

⸻

7. Premium Plan Model
	•	Free tier:
	•	Daily journaling, voice-to-task, weekly/monthly views.
	•	Premium tier (~$5–$10/month):
	•	Daily reminders (push, text, calls).
	•	Smart day-planning (AI auto-suggest when no input).
	•	Goal tracking.
	•	Priority support + early features.

⸻

🛠 Implementation Next Steps
	1.	Morning Recorder Page
	•	New route /morning.
	•	Auto-redirect to this page if:
	•	Time < 12 PM (local).
	•	And user hasn’t created tasks yet today.
	2.	Loading UI
	•	Create a VoiceLoading.vue component (spinner, dots, waveform animation).
	•	Use in VoiceRecorder + Journal + Morning Planner.
	3.	Reminders
	•	Add DB table user_preferences → store reminder time + channel (push, SMS).
	•	Hook into cron (Firebase Functions / Supabase scheduler).
	4.	Premium Toggle
	•	Add isPremium flag on user.
	•	Lock reminders + smart suggestions behind paywall.

⸻

📌 This way:
	•	V1 = voice-to-task journaling ✅ (what you’ve built).
	•	V2 = smart morning recorder + reminders + premium upsell 🚀.

⸻

👉 Question:
Do you want me to write the code for the Morning Recorder Page (/morning) + voice loading indicator component right away so you can plug it in, or should we first draft the premium user flow (pricing screen, upgrade CTA)?