Got it 👍 Let’s extend what you already have (your CallYogi + Planner app) to cover notifications, sticky cards, help, SEO, and premium features. Here’s a structured plan:

⸻

1. 🔔 Notifications

We already have Twilio SMS/email support in the AI Voice Assistant architecture ￼. Let’s reuse that for in-app notifications too.
	•	Types of notifications
	•	New feature announcements
	•	System issues (errors, downtime, sync failure)
	•	Journal/task reminders
	•	Premium feature upsells
	•	Implementation
	•	Add a notifications collection in Firebase: { id, type, message, createdAt, read: false }.
	•	Create a NotificationBell.vue in your header → badge count of unread.
	•	Dropdown list of notifications → link to details.
	•	Optional: integrate Twilio SMS/Email for urgent events.

⸻

2. 📌 Sticky Info Cards

Useful for surfacing important info on top of dashboard or journal view.
	•	A StickyCard.vue component that:
	•	Sticks below the header.
	•	Shows current focus, last streak, or AI-generated tip (e.g., “Focus on small wins today 💡”).
	•	Auto-dismiss or user can pin/unpin.

Example card content:

🌟 Reminder: You’re on a 3-day journal streak! Keep it going.

⸻

3. ❓ Help Page

Add a Help & Support section just above “Logout” in the sidebar/settings.
	•	Content:
	•	Quick start guide (how to add tasks, use voice journal, etc.)
	•	FAQ (why AI summary isn’t updating, where data is stored, etc.)
	•	Contact form → sends to Firebase collection + optional email notification.

⸻

4. 🔍 SEO + AI SEO

To prepare your planner for public discovery:
	•	Static SEO
		•	Add vue-meta or @vueuse/head → manage <title>, <meta> per page.
		•	Pre-render with Vite + SSR for Google crawl.

—

Implemented (baseline):

- Per-page SEO with @vueuse/head
  - Dashboard, Daily, Journal, Landing now set title/description/OG + canonical.
- Blog section
  - Routes: `/blog` index + `/blog/:slug` with a seeded article at `/blog/voice-task-planner-benefits`.
  - Article includes JSON-LD (schema.org/Article).
- WebApplication schema on Landing
  - JSON-LD embedded for Google Rich Results.
- Sitemap generation
  - Script at `apps/audit-agent-frontend/scripts/generate-sitemap.js` writes `dist/sitemap.xml` (+ mirrors to public).
  - Add `VITE_SITE_URL` to env to produce absolute URLs.

To enable pre-render (vite-ssg):

1) Install dev dep (in frontend dir):
   pnpm add -D vite-ssg

2) Create an SSG entry (optional alt to refactor main):
   - Add `src/main-ssg.js` (or refactor `src/main.js`) to export ViteSSG createApp and install plugins (router, pinia, head) inside the callback.
   - Ensure router guard skips during SSG (already added: `if (import.meta.env.SSR) next()`).

3) Scripts in package.json:
   - "build:ssg": "vite-ssg build"
   - "postbuild": "node scripts/generate-sitemap.js"

4) Prerender targets
   - Start with public routes: `/`, `/blog`, `/blog/voice-task-planner-benefits`, `/privacy-policy`, `/terms`, `/contact`.
   - Optionally include `/dashboard`, `/daily`, `/journal` (guard is skipped during SSG).

5) Verify
   - curl -I https://your-site.com/blog/voice-task-planner-benefits
   - Use Google Rich Results Test for the Article & WebApplication schema.

Notes
- Favicon and manifest already present in `public/`.
- Robots and existing static sitemap are kept; build script overwrites sitemap with fresh routes.
	•	AI SEO (dynamic)
	•	Auto-generate blog posts / landing page snippets from real user stories:
	•	“Daily Planner helped me cut overwhelm by 40%” → convert into article.
	•	Use OpenAI to expand task categories into searchable long-tail keywords:
	•	“voice task planner,” “habit tracking with AI,” “journaling insights.”
	•	Add sitemap + schema.org metadata for tasks/journals.

⸻

5. 💎 Premium Features

Make this your monetization layer:
	•	Premium ideas
	1.	Smart Reminders: Schedule via SMS/phone call (Twilio integration from CallYogi stack).
	2.	AI SEO Export: Export your journal into blog-ready posts.
	3.	Voice Insights: AI voice feedback (“Hey, you sound stressed today”).
	4.	Custom AI Focus Coach: Personalized weekly reflection summaries.
	•	Implementation
	•	Stripe subscription integration.
	•	Feature flag: premium only unlocks → extra API calls, SMS, TTS.

⸻

✅ So in short:
	•	Notifications → Firebase + Twilio.
	•	Sticky card → reusable Vue component.
	•	Help page → new route in app.
	•	SEO → vue-meta + AI-generated content.
	•	Premium → Stripe + Twilio reminders.

⸻

Want me to draft the NotificationBell.vue + StickyCard.vue components end-to-end, so you can plug them directly into your Dashboard?
