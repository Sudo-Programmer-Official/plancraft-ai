import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import quoteRoutes from "./routes/quote.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/quote", quoteRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
