import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();

// Allow list of origins
const allowedOrigins = [
  "https://audit-agent-66451.web.app/",
  "https://audit-agent-66451.firebaseapp.com/",
  "http://localhost:5173",
];

// Dynamic origin resolver for CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (e.g., mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// app.use("/api/quote", quoteRoutes);
// app.use("/api/upload", uploadRoutes);
// app.use("/api/ask", askRoutes);
// app.use("/api/finalize", finalizeRoutes);

// Routes
app.use("/api/ai", aiRoutes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
