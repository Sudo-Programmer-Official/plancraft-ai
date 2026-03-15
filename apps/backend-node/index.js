// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import aiRoutes from "./routes/aiRoutes.js";
// import transcribeRoutes from "./routes/transcribeRoutes.js";
// import subscriptionRoutes from "./routes/subscriptionRoutes.js";
// import notificationRoutes from "./routes/notificationRoutes.js";
// import stripeRoutes from "./routes/stripeRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import { stripeWebhookHandler } from "./routes/stripeRoutes.js";

// dotenv.config();

// const app = express();

// // Allow list of origins
// const allowedOrigins = [
//   "https://plancraftai.com",
//   "https://audit-agent-66451.web.app",
//   "https://audit-agent-66451.firebaseapp.com",
//   "http://localhost:5173",
//   "http://127.0.0.1:5173",
// ];

// // Dynamic origin resolver for CORS
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === '1'
//       const isDevVite = !!origin && /:5173$/.test(origin)
//       if (!origin || allowAny || allowedOrigins.includes(origin) || isDevVite) {
//         callback(null, true)
//       } else {
//         callback(new Error("Not allowed by CORS"))
//       }
//     },
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true
//   })
// );

// // Stripe webhook must receive the raw body for signature verification
// // app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

// // JSON parser for other routes
// app.use(express.json());

// // ✅ Health check route
// app.get("/", (req, res) => {
//   res.send("Backend is live!");
// });

// // server.js or app.js
// app.get("/health", (req, res) => res.status(200).send("OK"));
// // app.use("/api/quote", quoteRoutes);
// // app.use("/api/upload", uploadRoutes);
// // app.use("/api/ask", askRoutes);
// // app.use("/api/finalize", finalizeRoutes);

// // Routes
// app.use("/api/ai", aiRoutes);
// app.use("/api", transcribeRoutes); // exposes POST /api/transcribe
// app.use("/api", subscriptionRoutes);
// app.use("/api", notificationRoutes);
// app.use("/api", stripeRoutes);
// app.use("/api/admin", adminRoutes);

// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server ready at http://localhost:${PORT}`);
// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import aiRoutes from "./routes/aiRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";
import ttsRoutes from "./routes/ttsRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import integrationsRoutes from "./routes/integrationsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { stripeWebhookHandler } from "./routes/stripeWebhook.js";  // ✅ now from separate file
import reminderRoutes from "./routes/reminderRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import carryoverRoutes from "./routes/carryoverRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import parseRemindersRoutes from "./routes/parseReminders.js";
import { initScheduler } from "./services/scheduler.js";
import knowledgeRoutes from "./routes/knowledgeRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { attachAuth } from "./middleware/auth.js";
import twilioRoutes from "./routes/twilioRoutes.js";
import googleAuthRoutes, { handleOAuthCallback } from "./routes/googleAuthRoutes.js";
import googleCalendarRoutes from "./routes/googleCalendarRoutes.js";
import notifyRouter from "./routes/notifyRouter.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import talkToPlannerRoutes from "./routes/talkToPlannerRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import retentionAdminRoutes from "./routes/retentionAdminRoutes.js";
import { processReminderBatches } from "./services/reminderService.js";
import seoRoutes from "./routes/seoRoutes.js";
import gptRoutes from "./routes/gptRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import visionRoutes from "./routes/visionRoutes.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const integrationsDir = path.join(projectRoot, "integrations");

// Allow list of origins (extendable via CORS_ORIGINS env, comma-separated)
const allowedOrigins = [
  "https://plancraftai.com",
  "https://www.plancraftai.com",
  "capacitor://plancraftai.com",
  "capacitor://localhost",
  "ionic://localhost",
  "https://audit-agent-66451.web.app",
  "https://api.plancraftai.com", 
  "https://audit-agent-66451.firebaseapp.com",
  "https://audit-agent.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // ✅ Production domains
  "https://www.plancraftai.com",
  "https://plancraftai.web.app",   // if you still deploy via Firebase Hosting

  // ✅ Local development
  // ✅ Optional API subdomain (if backend runs separately)
  "https://api.plancraftai.com",
  "https://chat.openai.com",
]
  .concat(
    (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )

// CORS setup
const corsOptions = {
  origin: function (origin, callback) {
    const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === "1";
    const isDevVite = !!origin && /:5173$/.test(origin);
    if (!origin || allowAny || allowedOrigins.includes(origin) || isDevVite) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  // Allow custom headers used by the frontend interceptor
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-user-email",
    "x-user-id",
    "x-user-role",
    "x-user-tz",
    "x-user-country",
    "x-requested-with",
    "x-app-token",
    "x-workspace-id",
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
// Ensure preflight is handled for any path
app.options("*", cors(corsOptions))

// Extra safety: reflect requested headers for preflight to avoid header-name casing issues
function isAllowedOrigin(origin) {
  const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === "1"
  const isDevVite = !!origin && /:5173$/.test(origin)
  return !origin || allowAny || allowedOrigins.includes(origin) || isDevVite
}

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin
    if (isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*')
      res.header('Vary', 'Origin')
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
      const reqHeaders = req.headers['access-control-request-headers']
      res.header(
        'Access-Control-Allow-Headers',
        reqHeaders ||
          'Content-Type, Authorization, X-User-Email, X-User-Id, X-User-Role, X-User-Tz, X-User-Country, X-Requested-With, X-App-Token, X-Workspace-Id',
      )
      return res.sendStatus(204)
    }
  }
  next()
})

// ✅ Stripe webhook must come BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

app.get('/api/stripe/webhook-health', (req, res) => {
  res.send({ ok: true, message: 'Stripe Webhook endpoint active ✅' })
})

// JSON parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (fs.existsSync(integrationsDir)) {
  app.use("/integrations", express.static(integrationsDir));
}

// --- Google OAuth callbacks (public) ---
// Mount BEFORE auth-required routers to avoid 401 from other routers' requireAuth middlewares
app.get('/api/google/oauth/callback', handleOAuthCallback)
app.get('/api/google-calendar/callback', handleOAuthCallback)
// Also expose root-level aliases to avoid any /api middleware interference on some hosts
app.get('/google/oauth/callback', handleOAuthCallback)
app.get('/google-calendar/callback', handleOAuthCallback)

// Lightweight trace logger for Google OAuth routes (enable with GOOGLE_OAUTH_DEBUG=1)
if (String(process.env.GOOGLE_OAUTH_DEBUG || '').toLowerCase() === '1' || String(process.env.GOOGLE_OAUTH_DEBUG || '').toLowerCase() === 'true') {
  app.use((req, _res, next) => {
    try {
      if (/google.*callback|google\/connect/.test(req.path)) {
        console.info('[TRACE]', req.method, req.path, { origin: req.headers.origin, accept: req.headers['accept'] })
      }
    } catch {}
    next()
  })
}

// Attach auth (prefer X-App-Token, fallback to Firebase) for all API routes
app.use('/api', attachAuth)

// Health checks
app.get("/", (req, res) => res.send("Backend is live!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

// Feature routes
app.use("/api/ai", aiRoutes);
// Back-compat: allow calling AI endpoints under /api as well
app.use("/api", aiRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api", transcribeRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", notificationRoutes);
app.use("/api/notify", notifyRouter);
app.use("/api", stripeRoutes);
app.use("/api/admin/retention", retentionAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", settingsRoutes);
app.use("/api", integrationsRoutes);
app.use("/api", gptRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", carryoverRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", parseRemindersRoutes);
app.use("/api", testRoutes);
app.use("/api", knowledgeRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/twilio", twilioRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/talk", talkToPlannerRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api", billingRoutes);
app.use("/api", journalRoutes);
app.use("/api", locationRoutes);
app.use("/api", workspaceRoutes);
app.use("/api", visionRoutes);
app.use("/", seoRoutes);
// Mount Google routes (guarded internally by feature flag)
app.use("/api", googleAuthRoutes);
app.use("/api", googleCalendarRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

// Boot scheduler after app starts
initScheduler().catch((err) => {
  console.error('❌ Failed to init scheduler', err)
})

const reminderWorkerIntervalMs = Number(process.env.REMINDER_WORKER_INTERVAL_MS || 60000);
setInterval(() => {
  processReminderBatches()
    .catch((err) => console.error("[ReminderWorker] batch run failed", err?.message || err));
}, reminderWorkerIntervalMs);

processReminderBatches().catch((err) => console.error("[ReminderWorker] initial run failed", err?.message || err));
