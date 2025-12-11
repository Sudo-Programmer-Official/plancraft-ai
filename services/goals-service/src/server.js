import express from "express";
import cors from "cors";
import goalsRouter from "./routes/goalsRouter.js";

function resolveAllowedOrigins() {
  const fromEnv = (process.env.GOALS_SERVICE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://localhost:4000",
    "https://plancraftai.com",
    "https://www.plancraftai.com",
  ];
  return Array.from(new Set([...fromEnv, ...defaults]));
}

export function createGoalsApp() {
  const app = express();
  const allowedOrigins = resolveAllowedOrigins();
  const appRunnerPattern = /\.awsapprunner\.com$/;
  const plancraftPattern = /\.plancraftai\.com$/;
  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || process.env.ALLOW_ANY_ORIGIN === "1") {
        return callback(null, true);
      }
      const isDevVite = !!origin && /:51(7|8)3$/.test(origin);
      if (isDevVite) return callback(null, true);
      if (plancraftPattern.test(origin)) return callback(null, true);
      if (appRunnerPattern.test(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "*",
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-user-email",
      "x-request-id",
      "x-app-token",
      "x-user-role",
      "x-user-tz",
      "x-user-country",
      "x-workspace-id",
    ],
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "goals" });
  });
  app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));

  app.use("/api/goals", goalsRouter);

  app.use((err, req, res, _next) => {
    console.error("[GoalsService] unhandled error", err?.message || err);
    const status = Number(err?.status) || 500;
    res.status(status).json({ error: err?.message || "Internal error" });
  });

  return app;
}

export default createGoalsApp;
