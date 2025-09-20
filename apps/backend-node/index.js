import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";
import transcribeRoutes from "./routes/transcribeRoutes.js";

dotenv.config();

const app = express();

// Allow list of origins
const allowedOrigins = [
  "https://audit-agent-66451.web.app",
  "https://audit-agent-66451.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// Dynamic origin resolver for CORS
app.use(
  cors({
    origin: function (origin, callback) {
      const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === '1'
      const isDevVite = !!origin && /:5173$/.test(origin)
      if (!origin || allowAny || allowedOrigins.includes(origin) || isDevVite) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json());

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// server.js or app.js
app.get("/health", (req, res) => res.status(200).send("OK"));
// app.use("/api/quote", quoteRoutes);
// app.use("/api/upload", uploadRoutes);
// app.use("/api/ask", askRoutes);
// app.use("/api/finalize", finalizeRoutes);

// Routes
app.use("/api/ai", aiRoutes);
app.use("/api", transcribeRoutes); // exposes POST /api/transcribe

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
