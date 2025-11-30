import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();

const envOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")?.map((o) => o.trim()).filter(Boolean) || [];
const baseOrigins = [
  "https://plancraftai.com",
  "https://www.plancraftai.com",
  "https://app.plancraftai.com",
  "http://localhost:5173",
  "http://localhost:4173",
];
const allowAll = process.env.CORS_ALLOW_ALL !== "0";
const appRunnerPattern = /\.awsapprunner\.com$/;
const plancraftPattern = /\.plancraftai\.com$/;

const corsOptions = {
  origin: (_origin, callback) => {
    if (allowAll) return callback(null, true);
    if (!_origin) return callback(null, true);
    if ([...baseOrigins, ...envOrigins].includes(_origin)) return callback(null, true);
    if (plancraftPattern.test(_origin)) return callback(null, true);
    if (appRunnerPattern.test(_origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-app-token",
    "x-user-country",
    "x-user-email",
    "x-user-id",
    "x-user-role",
    "x-user-tz",
    "x-request-id",
    "x-service-token",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/habits", routes);

app.use(errorHandler);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`habit-service listening on ${PORT}`);
});
