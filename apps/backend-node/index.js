import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import quoteRoutes from "./routes/quote.js";

dotenv.config();

const app = express();
// app.use(cors());
// Enable CORS for all origins (safe for dev, restrict later in prod)
app.use(
  cors({
    origin: "*", // ✅ Change this later in production
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

app.use("/api/quote", quoteRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
