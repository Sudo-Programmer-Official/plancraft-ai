Here’s a clean snapshot of how reminders + time work right now, plus how the new enhancement (tasks store wiring change) fits in — without touching the working reminder pipeline.

⸻

1. End-to-end reminder & time flow (as of now)

1.1. User actions
	1.	User opens TaskPlannerDialog (new task or edit).
	2.	User:
	•	Picks a date (selectedDate),
	•	Types or speaks natural language into input (e.g. “remind me at 11.30 p.m. to go to sleep”),
	•	Optionally sets Reminder Time (reminderTime) manually,
	•	Optionally toggles Set reminder and selects channels (PWA, WhatsApp, etc.),
	•	Clicks + Generate Tasks (AI path) or Save Task (manual path).

Everything below describes what happens in the AI path; the manual path just saves the form fields as-is.

⸻

1.2. Context build ([time_context.js] → backend)

When you call generateTasksFromText(input) from TaskPlannerDialog:
	1.	The frontend builds a time context (in time_context.js) that includes:
	•	timezone: derived from getUserTimezone() or browser fallback.
	•	planDate: the selectedDate in local user date key.
	•	priorTaskEnd: last scheduled task for that day (if any).
	•	activeHours: user’s typical active window (e.g. 08:00–23:00).
	•	userPattern: hints like “night owl”, frequent study times, etc.
	2.	That context is:
	•	Logged as [TimeBrain][Context] ...
	•	Sent along with the plain text to the backend /split-tasks endpoint via generateTasksFromText.

Goal: give GPT enough temporal context so phrases like “later tonight”, “after my class”, etc. can be resolved to concrete datetimes.

⸻

1.3. AI parsing (backend: openaiService.splitTasks + time_parser.js)

On the backend:
	1.	openaiService.splitTasks:
	•	Injects the time context into the GPT prompt.
	•	Instructs GPT to return a structured list of tasks with:
	•	title / name
	•	optional timeHint (raw phrase)
	•	optional scheduledTime (ISO if obvious)
	•	relation (after_previous, same_time_previous, etc.)
	•	gapMinutes between tasks if chained
	•	timeConfidence score or bucket.
	2.	time_parser.js:
	•	Normalizes GPT’s output into the canonical format.
	•	Fills in:
	•	timeHint / time_hint
	•	timeRelation / relation
	•	gapMinutes
	•	timeConfidence
	•	Flags low-confidence entries that may need another pass by extractReminderTime.
	3.	For ambiguous or relative phrases (e.g. “later”, “after class”):
	•	The parser may leave scheduledTime empty but keep timeHint and relation info.

This is the primary time “brain” – we are not touching this pipeline with the recent frontend work.

⸻

1.4. Frontend refinement & save (TaskPlannerDialog.vue)

On the frontend, TaskPlannerDialog receives the parsed tasks array from generateTasksFromText and then:
	1.	(New wiring enhancement)
It uses a plain tasks array (unwrapped from the ref store) so that:
	•	tasks.filter(...) and other array ops work cleanly when building context or computing order.
	•	This fixes the earlier runtime error where tasks.value.filter could be undefined in some flows.
👉 This change only affects how the dialog reads from the tasks store, not how time or reminders are scheduled.
	2.	Time refinement in the dialog (for each AI task):
	•	If scheduledTime is present:
	•	It’s interpreted as UTC or local based on suffix and normalized using dayjs + timezone plugins.
	•	If scheduledTime is missing but timeHint exists:
	•	The dialog may call extractReminderTime(hint, { now, timezone }) as a second-stage parser.
	•	The dialog converts everything to UTC ISO using helpers like:
	•	buildLocalIso(ymd, hhmm)
	•	normalizeIsoToUtc(iso, tz)
	•	The dialog also respects relations:
	•	after_previous: position this after the previous task + gapMinutes.
	•	same_time_previous: aligns to the previous task’s start time.
	•	Guards are in place so every dayjs.tz(...) gets a safe string timezone or falls back to 'UTC'.
	3.	The finalized task object saved to Firebase (per task) includes:
	•	Core
	•	title
	•	details
	•	link
	•	completed
	•	date (local day key, e.g. 2025-11-05)
	•	order (for list positioning)
	•	logs (audit trail)
	•	Time / reminder fields
	•	reminderTime – local HH:mm string for UI.
	•	scheduledTime – UTC ISO for reminders and analytics.
	•	timeHint – original phrase (from backend).
	•	timeRelation / relation – sequencing relative to previous tasks.
	•	gapMinutes – spacing between tasks.
	•	timeConfidence – parsing confidence bucket.
	•	timezone – sanitized IANA string (falls back to UTC if malformed).
	•	Meta
	•	source: 'planner'
This is the canonical data model your Reminder & Overview screens use.

⸻

1.5. Reminder scheduling

Once tasks are saved:
	1.	TaskPlannerDialog checks the Set reminder toggle + channels:
	•	The user’s reminder preferences are loaded once (getReminderPreferences) and normalized.
	•	applyReminderDefaults + computeReminderChannels ensure:
	•	Reminder channels are whitelisted (pwa, whatsapp, email, sms, voice_call).
	•	Only up to two instant channels are used for creation notifications.
	2.	For each saved task with a valid scheduledTime:
	•	A reminder payload is constructed:

{
  taskId,
  text: task.title,
  scheduledTime: task.scheduledTime, // UTC ISO
  timezone: sanitizedTz,
  channels: reminderChannels
}


	•	The dialog tries a batch call first:
	•	POST /reminders/batch with the reminder list.
	•	Reads X-Plan-Warning headers and surfaces them via ElMessage when needed.
	•	If batch scheduling fails:
	•	Fallback to scheduleReminder(...) per reminder.
	•	Handles 403 / quota responses with friendly messages.

	3.	The ReminderOverview screen:
	•	Loads reminders from storage / Firestore.
	•	Logs [TimeBrain][Reminders] ... metrics to correlate parsing decisions with actual sends.

⸻

1.6. Edit flow

When editing a task:
	1.	TaskPlannerDialog receives props.task.
	2.	Initial state is hydrated with:
	•	input ← task.title
	•	details ← task.details
	•	link ← task.link
	•	selectedDate ← task.date
	•	reminderTime ← task.reminderTime
	3.	tryPrefillReminder(task):
	•	Calls getReminderStatus(uid, task.id).
	•	Picks the most relevant scheduled reminder.
	•	Converts the stored UTC time → user timezone (with safe tz handling).
	•	Prefills reminderTime as HH:mm.

Saving an edit updates the task and keeps the reminder pipeline unchanged (unless the time is changed explicitly).

⸻

2. What the latest enhancement changed (and didn’t change)

2.1. Swapped tasks store wiring

Change:
	•	TaskPlannerDialog now works against a plain array of tasks for internal operations, instead of directly relying on tasks as a ref in every place where we need .filter(), etc.

Why:
	•	There was a runtime error where tasks.value.filter could be hit in a context where tasks wasn’t yet a fully initialized ref or was being passed around incorrectly.
	•	Using a guaranteed array inside the dialog makes context building & ordering robust (especially during AI generation flows).

Impact on reminder/time flow:
	•	✅ No behavioral change in:
	•	Time parsing (AI or extractReminderTime).
	•	UTC normalization.
	•	Reminder payload structure.
	•	Channels, preferences, or scheduling calls.
	•	✅ Only affects:
	•	Internal computations that look at existing tasks for a day (e.g. ordering, prior-task context).
	•	Stability of those computations.

So your reminders that were “working fine” remain untouched; we just removed a runtime footgun around task iteration.

⸻

3. Documentation hook for future enhancements

When we add the next features, we plug them into this flow:

3.1. Title enrichment + dedupe (now live)

Where: split across backend + TaskPlannerDialog.

Backend (openaiService.splitTasks):
	•	Asks GPT to emit:
	•	title – concise verb + noun.
	•	displayTitle – the polished UI wording.
	•	rawPhrase – literal fragment from the user request.
	•	Adds guardrails so “set reminder” or stray verbs are not emitted as separate tasks.

Frontend (TaskPlannerDialog):
	•	enrichTitle() chooses the best candidate (displayTitle → title → rawPhrase) and patches weak verbs (“Go” → “Prepare for sleep”).
	•	normalizeTitleKey() removes duplicates when two tasks would be the same action.
	•	Saved task metadata keeps finalTitle/rawPhrase in meta for future learning.

3.2. Auto-close after AI save

After a successful generateTasks() run:
	•	If notifPrompt isn’t blocking (i.e., prompt dialog isn’t open), the planner now calls closeDialog() automatically so the user doesn’t stay on the modal.
	•	This fixes the earlier issue where saved events fired but the dialog remained open.

3.3. No-op to reminder engine

All of the above are cosmetic / UX lifts:
	•	The UTC math, reminder scheduling payloads, and channel logic remain identical.
	•	New metadata (displayTitle/rawPhrase/finalTitle) travels in task.meta only; reminder payloads still use the finalized title string.

Contract: pure UI enrichment; the reminder/time engine stays as is.

⸻

3.2. Over-splitting and dedupe (planned)

Where: before normalization in the frontend (array of tasks from generateTasksFromText).

Behavior:
	•	If multiple tasks share almost identical titles (e.g. three tasks named “Set reminder”), and:
	•	timeConfidence is low, and
	•	timeRelation doesn’t imply a real chain,
	•	Then dedupe or merge them into a single task before we run through the normalization & save.

Again, this is a pre-processing step on the list, not a change to the time engine.

⸻

3.3. Dialog auto-close (planned UX tweak)

Where: at the end of the success path in generateTasks() and save().

Behavior:
	•	After:
	•	ElNotification(… 'Success' …)
	•	emit('saved', savedItems)
	•	Add:

if (!notifPromptOpen.value) {
  setTimeout(() => closeDialog(), 300)
}


	•	This keeps the dialog open only when we need the notification setup prompt.

⸻

3.4. Logging contract ([TimeBrain] / [TimeFlow] / [TimeFix])

As we add enhancements, we keep these log streams consistent:
	•	[TimeBrain][Context] – when building time_context before AI calls.
	•	[TimeBrain][Reminders] – when reminders are loaded / summarized.
	•	[TimeFlow] – planner flow (selected timezone, parsed hints, normalizeTask decisions).
	•	[TimeFix] – any fallback or timezone correction, so we can debug issues like invalid tz strings.

This gives us a traceable timeline from:

user text → context → GPT output → parser decisions → frontend refinements → saved tasks → scheduled reminders.
