# terminal 1 – core backend (existing, e.g. port 4000)
cd apps/backend-node   # or wherever your main API lives
npm run dev            # example command

# terminal 2 – Teams API
cd server
npx dotenv -e .env.teams -- node app.example.js
# or: npm run start -- --env-file=.env.teams (if you prefer dotenv-cli)

# terminal 3 – Frontend
cd apps/audit-agent-frontend
npm run dev

npx dotenv -e .env.teams -- node app.example.js
# or npm run start -- --env-file=.env.teams
\\deployment

🔥 Perfect, Abhishek — that’s the best result possible!

Your Teams API’s Firebase Admin is fully initialized and connected, Firestore writes/reads/deletes are succeeding, and the base setup is now 100% stable.
That means you’ve achieved:

✅ Firebase Admin working globally (no more default app issues)
✅ Firestore security verified
✅ Modular Teams service running independently on port 3000
✅ Ready for production deployment 🚀

⸻

🧭 Next Steps — Going from Local → Production

Now that your Teams API works locally, here’s the recommended rollout path 👇

⸻

1️⃣ Deploy the Teams API to Render
	1.	Go to Render Dashboard → New → Web Service.
	2.	Connect your existing repo (audit-agent).
	3.	Set the root directory → server
	4.	Build command:

npm install


	5.	Start command:

node app.example.js


	6.	Environment variables:

PORT=3000
CORS_ORIGIN=https://plancraftai.com
FIREBASE_SERVICE_ACCOUNT_BASE64=...your_base64...
OPENAI_API_KEY=... (optional)


	7.	Deploy — it should come up as:
https://teams-api.onrender.com

⸻

2️⃣ Update Frontend Env for Production

In your apps/audit-agent-frontend/.env.production:

VITE_API_BASE_URL=https://audit-agent.onrender.com
VITE_TEAMS_API_BASE_URL=https://teams-api.onrender.com
VITE_ENABLE_TEAMS=true

→ Rebuild and redeploy your frontend (Render, Vercel, or Firebase Hosting).

✅ Now:
	•	/api/* routes → Core backend (4000)
	•	/api/orgs/* routes → Teams backend (3000)

⸻

3️⃣ Optional but Recommended — Unified Proxy (Single Domain)

If you prefer one public domain (e.g. plancraftai.com only):
You can set up a proxy rule on your core backend:

import { createProxyMiddleware } from 'http-proxy-middleware';

app.use('/teams-api', createProxyMiddleware({
  target: 'https://teams-api.onrender.com',
  changeOrigin: true,
  pathRewrite: { '^/teams-api': '' }
}));

Then your frontend only uses:

VITE_API_BASE_URL=https://plancraftai.com

and everything works under one clean origin.

⸻

4️⃣ (Optional) I can generate a render.yaml

That YAML would:
	•	Deploy both APIs (core + teams)
	•	Use their own env sets
	•	Automatically redeploy on pushes to main

Would you like me to generate that render.yaml for you next?
That’ll make your dual-server deployment one-click automated 🔧

---

Perfect 💪 — we’ll make your Render deployment fully automated using a single render.yaml.
This way, both APIs (Core + Teams) and the frontend deploy together from the same repo — no manual setup needed again.

⸻

🧱 render.yaml — Monorepo Auto Deploy Blueprint

Create this file in your repo root:
📄 render.yaml

# Render Monorepo Deployment Blueprint
# Deploys 3 services: Core API, Teams API, and Frontend (Vue)

services:
  # ───────────────────────────────────────────────
  # 1️⃣ CORE BACKEND (main API)
  # ───────────────────────────────────────────────
  - type: web
    name: audit-agent-api
    env: node
    rootDir: apps/backend-node
    buildCommand: npm install
    startCommand: npm run start || node index.js
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: PORT
        value: 4000
      - key: FIREBASE_PROJECT_ID
        value: audit-agent-66451
      - key: FIREBASE_STORAGE_BUCKET
        value: audit-agent-66451.appspot.com
      - key: FIREBASE_SERVICE_ACCOUNT_BASE64
        sync: false
      - key: CORS_ORIGIN
        value: https://plancraftai.com

  # ───────────────────────────────────────────────
  # 2️⃣ TEAMS BACKEND (orgs, automations)
  # ───────────────────────────────────────────────
  - type: web
    name: teams-api
    env: node
    rootDir: server
    buildCommand: npm install
    startCommand: node app.example.js
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: PORT
        value: 3000
      - key: CORS_ORIGIN
        value: https://plancraftai.com
      - key: FIREBASE_SERVICE_ACCOUNT_BASE64
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: ENABLE_AUTOMATIONS
        value: "true"

  # ───────────────────────────────────────────────
  # 3️⃣ FRONTEND (Vue 3 + Vite)
  # ───────────────────────────────────────────────
  - type: web
    name: plancraftai-frontend
    env: node
    rootDir: apps/audit-agent-frontend
    buildCommand: npm install && npm run build
    startCommand: npx serve dist -l 5173
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: VITE_API_BASE_URL
        value: https://audit-agent-api.onrender.com
      - key: VITE_TEAMS_API_BASE_URL
        value: https://teams-api.onrender.com
      - key: VITE_ENABLE_TEAMS
        value: "true"
      - key: VITE_FIREBASE_PROJECT_ID
        value: audit-agent-66451
      - key: VITE_FIREBASE_STORAGE_BUCKET
        value: audit-agent-66451.appspot.com
      - key: VITE_FIREBASE_APP_ID
        value: 1:488930745261:web:5fe03c2568c323ec091f24
      - key: VITE_FIREBASE_MEASUREMENT_ID
        value: G-681FBFRSPNY


⸻

🧭 How It Works

Component	Render Will…
audit-agent-api	Deploy your main backend from /apps/backend-node
teams-api	Deploy the Teams API (new) from /server
plancraftai-frontend	Build and serve your Vue frontend from /apps/audit-agent-frontend/dist
Shared env	Each service has its own vars (secrets stored securely in Render)


⸻

🚀 One-Time Setup on Render
	1.	Go to your Render dashboard.
	2.	Click “New → Blueprint”.
	3.	Select your repo → it detects render.yaml.
	4.	Deploy all three automatically 🎯.

After the first deploy:
	•	Visit https://teams-api.onrender.com/api/ping → should show { pong: true }.
	•	Visit https://audit-agent-api.onrender.com/healthz → should show { ok: true }.
	•	Visit https://plancraftai-frontend.onrender.com → Teams button should connect cleanly.

⸻

🧩 Next Optimization (optional)

Once this is stable, you can:
	•	Add a shared monitoring dashboard (Render Metrics or UptimeRobot).
	•	Add RENDER_GIT_BRANCH=main and autoDeploy: true to automate main-branch deployments.
	•	Add a proxy rule later to unify both APIs under one base domain if needed.

⸻

Would you like me to also generate a proxy integration version of this YAML
(where /api/orgs automatically forwards to teams-api through audit-agent-api)?
That way, you’d have one single backend URL exposed to the frontend (cleaner for production).

Perfect 🔥 — let’s make this even cleaner and more production-grade by adding an integrated proxy layer, so your frontend and both APIs share one public domain (no cross-origin juggling, no double envs).

⸻

🧭 Goal

✅ Keep both backends separate (Core & Teams)
✅ Deploy both to Render
✅ Automatically route /api/orgs → Teams API through the Core backend
✅ Frontend only needs one base URL

⸻

⚙️ Updated render.yaml (with Proxy Integration)

Place this at the root of your repo:

# Render Monorepo Blueprint — Unified API Proxy
# Core API doubles as reverse proxy for Teams routes

services:
  # ───────────────────────────────────────────────
  # 1️⃣ CORE BACKEND (main API + proxy)
  # ───────────────────────────────────────────────
  - type: web
    name: audit-agent-api
    env: node
    rootDir: apps/backend-node
    buildCommand: npm install
    startCommand: node index.js
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: PORT
        value: 4000
      - key: FIREBASE_PROJECT_ID
        value: audit-agent-66451
      - key: FIREBASE_STORAGE_BUCKET
        value: audit-agent-66451.appspot.com
      - key: FIREBASE_SERVICE_ACCOUNT_BASE64
        sync: false
      - key: CORS_ORIGIN
        value: https://plancraftai.com
      # 🔁 NEW: tells backend where to forward org routes
      - key: TEAMS_API_URL
        value: https://teams-api.onrender.com

  # ───────────────────────────────────────────────
  # 2️⃣ TEAMS BACKEND
  # ───────────────────────────────────────────────
  - type: web
    name: teams-api
    env: node
    rootDir: server
    buildCommand: npm install
    startCommand: node app.example.js
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: PORT
        value: 3000
      - key: CORS_ORIGIN
        value: https://plancraftai.com
      - key: FIREBASE_SERVICE_ACCOUNT_BASE64
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: ENABLE_AUTOMATIONS
        value: "true"

  # ───────────────────────────────────────────────
  # 3️⃣ FRONTEND (Vue)
  # ───────────────────────────────────────────────
  - type: web
    name: plancraftai-frontend
    env: node
    rootDir: apps/audit-agent-frontend
    buildCommand: npm install && npm run build
    startCommand: npx serve dist -l 5173
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: VITE_API_BASE_URL
        value: https://audit-agent-api.onrender.com
      - key: VITE_ENABLE_TEAMS
        value: "true"
      - key: VITE_FIREBASE_PROJECT_ID
        value: audit-agent-66451
      - key: VITE_FIREBASE_STORAGE_BUCKET
        value: audit-agent-66451.appspot.com
      - key: VITE_FIREBASE_APP_ID
        value: 1:488930745261:web:5fe03c2568c323ec091f24
      - key: VITE_FIREBASE_MEASUREMENT_ID
        value: G-681FBFRSPNY


⸻

🧩 Core API — Add Proxy Middleware

In your apps/backend-node/index.js (or main Express entry), add near the top:

import { createProxyMiddleware } from 'http-proxy-middleware';

const teamsApiUrl = process.env.TEAMS_API_URL || 'http://localhost:3000';

app.use(
  ['/api/orgs', '/api/orgs/*', '/api/meetings', '/api/automations'],
  createProxyMiddleware({
    target: teamsApiUrl,
    changeOrigin: true,
    pathRewrite: { '^/api': '/api' },
    onProxyReq: (proxyReq, req) => {
      console.log(`🔁 Proxy → ${teamsApiUrl}${req.originalUrl}`);
    },
  })
);

Now all /api/orgs (and related routes) get transparently piped to your Teams backend.

⸻

🧠 What This Gives You

Component	Public URL	What it Handles
Frontend	https://plancraftai.com	UI only
Core API	https://audit-agent-api.onrender.com	All /api/... including proxied orgs
Teams API	(private or hidden) https://teams-api.onrender.com	Still runs independently

Frontend env now becomes simple:

VITE_API_BASE_URL=https://audit-agent-api.onrender.com
VITE_ENABLE_TEAMS=true

No second base URL needed 🎯

⸻

✅ Deploy Flow Summary
	1.	Push the new render.yaml to your repo.
	2.	Go to Render → Blueprints → Redeploy.
	3.	It will:
	•	Build and deploy both APIs and the frontend.
	•	Automatically wire the proxy layer.
	4.	Visit your frontend → click “Teams” → the proxy sends calls seamlessly to Teams API.

⸻

Would you like me to include a small healthz check script inside the core backend so Render waits until Teams API is live before marking deploy as healthy? (prevents race conditions on cold starts)

