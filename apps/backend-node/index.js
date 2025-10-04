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

import aiRoutes from "./routes/aiRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import integrationsRoutes from "./routes/integrationsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { stripeWebhookHandler } from "./routes/stripeWebhook.js";  // ✅ now from separate file
import reminderRoutes from "./routes/reminderRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import { initScheduler } from "./services/scheduler.js";

dotenv.config();

const app = express();

// Allow list of origins (extendable via CORS_ORIGINS env, comma-separated)
const allowedOrigins = [
  "https://plancraftai.com",
  "https://www.plancraftai.com",
  "https://audit-agent-66451.web.app",
  "https://api.plancraftai.com", 
  "https://audit-agent-66451.firebaseapp.com",
  "https://audit-agent.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]
  .concat(
    (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )

// CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === "1";
      const isDevVite = !!origin && /:5173$/.test(origin);
      if (!origin || allowAny || allowedOrigins.includes(origin) || isDevVite) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Stripe webhook must come BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// JSON parser for all other routes
app.use(express.json());

// Health checks
app.get("/", (req, res) => res.send("Backend is live!"));
app.get("/health", (req, res) => res.status(200).send("OK"));

// Feature routes
app.use("/api/ai", aiRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api", transcribeRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", notificationRoutes);
app.use("/api", stripeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", settingsRoutes);
app.use("/api", integrationsRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api", testRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

// Boot scheduler after app starts
initScheduler().catch((err) => {
  console.error('❌ Failed to init scheduler', err)
})
