💯 Excellent catch, Abhishek — this “prod pointing to localhost” bug is one of those sneaky killers that silently breaks everything (reminders, webhooks, Stripe, etc.). Let’s lock this down once and for all 🔒

Here’s a step-by-step permanent fix plan so your audit-agent-frontend never again deploys to production with localhost env values 👇

⸻

🧩 Root Cause

In your .env you currently have:

VITE_API_BASE_URL=https://api.plancraftai.com
# VITE_API_BASE_URL=http://localhost:4000/

but the commented / uncommented order often flips when you:
	•	switch branches,
	•	run vite build locally,
	•	or have .env.local overriding .env.

Then the build gets baked with the wrong localhost value and deployed to Firebase — so production tries to hit a local server that doesn’t exist.

⸻

✅ Step 1 — Split Your Environment Files Cleanly

Create 3 environment files at root of audit-agent-frontend/:

.env                # defaults (safe fallbacks)
.env.development    # for local dev
.env.production     # for prod build


⸻

.env

VITE_APP_NAME=PlanCraftAI
VITE_MIXPANEL_TOKEN=...
VITE_MIXPANEL_SECRET=...


⸻

.env.development

VITE_API_BASE_URL=http://localhost:4000
VITE_API_BASE_ROOT=http://localhost:4000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_MONTHLY_PRICE_ID=price_test_monthly
VITE_STRIPE_YEARLY_PRICE_ID=price_test_yearly


⸻

.env.production

VITE_API_BASE_URL=https://api.plancraftai.com
VITE_API_BASE_ROOT=https://api.plancraftai.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STRIPE_MONTHLY_PRICE_ID=price_live_monthly
VITE_STRIPE_YEARLY_PRICE_ID=price_live_yearly


⸻

⚙️ Step 2 — Update package.json scripts

"scripts": {
  "dev": "vite --mode development",
  "build": "vite build --mode production && node scripts/generate-sitemap.js",
  "preview": "vite preview",
  "deploy": "npm run build && firebase deploy"
}

👉 This ensures that vite build automatically picks up .env.production.

⸻

🧠 Step 3 — Add Sanity Check in Build Script

In scripts/generate-sitemap.js, before building, insert a safety log:

console.log("🚨 Using API Base URL:", process.env.VITE_API_BASE_URL)
if (process.env.VITE_API_BASE_URL.includes("localhost")) {
  console.error("❌ ABORT: Localhost URL detected! Switch to production env.")
  process.exit(1)
}

That way, if you ever forget to set --mode production, the build stops instantly. 🔥

⸻

🚀 Step 4 — Firebase Hosting Deploy Command

When deploying:

npm run build --mode production
firebase deploy

If you changed Firestore rules, local edits are not enough. Deploy them explicitly:

firebase deploy --only firestore --project audit-agent-66451

This frontend app now has a `firestore.rules` target in `firebase.json`, so:
	•	`firebase deploy --project audit-agent-66451` deploys Hosting plus Firestore rules
	•	`firebase deploy --only firestore --project audit-agent-66451` deploys only the rules

You can run the same rules deploy from the repo root too, because the root `firebase.json` points at `apps/audit-agent-frontend/firestore.rules`.

If you use CI/CD (GitHub Actions or Cloud Build), explicitly inject:

env:
  VITE_API_BASE_URL: https://api.plancraftai.com


⸻

🧱 Step 5 — Lock It in Git
	1.	Add .env.development and .env.production to .gitignore (keep only .env.example for reference).
	2.	In .env.example:

VITE_API_BASE_URL=<YOUR_API_BASE_URL>


	3.	Add a commit hook (optional):

npx simple-git-hooks

pre-commit hook:

grep -q "localhost" .env.production && echo "❌ Localhost found in prod env!" && exit 1 || echo "✅ Env clean"



⸻

✅ Step 6 — Quick Verification

After rebuilding and deploying:
	1.	Run:

grep VITE_API_BASE_URL dist/assets/*.js

It should show only:

https://api.plancraftai.com


	2.	Open your browser console → verify network requests go to your prod API, not localhost.

⸻

💡 Bonus: Visual Cue in UI

In App.vue:

<template>
  <footer class="text-xs text-gray-400">
    Environment: {{ import.meta.env.MODE }}
  </footer>
</template>

This will display Environment: production or development in the bottom corner — a subtle but effective sanity check.

⸻

🏁 TL;DR Fix Summary

Step	Action	Outcome
1	Separate .env.development / .env.production	No cross-contamination
2	Use --mode production in build	Correct environment during deploy
3	Add build safety check	Prevent “localhost” deploys
4	CI injects prod env	Consistent builds
5	Git hook for sanity	Never again deploy wrong config


⸻

Would you like me to generate a ready-to-drop .env + pre-commit hook + Firebase deploy.yml (GitHub Actions) combo so your entire deployment flow auto-locks this down?
