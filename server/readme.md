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