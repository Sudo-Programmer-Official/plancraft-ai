// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import quoteRoutes from "./routes/quote.js";

// dotenv.config();

// const app = express();
// // app.use(cors());
// const allowedOrigins = [
//   "https://www.prompt2quote.com",
//   "https://prompt2quote.com",
//   "http://localhost:5173",
// ];
// // const allowedOrigin =
// //   process.env.NODE_ENV === "production"
// //     ? "https://www.prompt2quote.com"
// //     : "http://localhost:5173";
// if (allowedOrigins.includes(origin)) {
//   app.use(
//     cors({
//       origin: allowedOrigin,
//       methods: ["GET", "POST", "OPTIONS"],
//       allowedHeaders: ["Content-Type"],
//     })
//   );
// }
// app.use(express.json());

// // ✅ Add this route to verify deployment success
// app.get("/", (req, res) => {
//   res.send("Backend is live!");
// });

// app.use("/api/quote", quoteRoutes);

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server ready at http://localhost:${PORT}`);
// });

// import cors from "cors";

// // CORS Middleware (exact Vercel domain recommended in prod)
// app.use(
//   cors({
//     origin: "https://prompt-git-main-fullstuffdevelopers-projects.vercel.app",
//     methods: ["GET", "POST", "OPTIONS"],
//     allowedHeaders: ["Content-Type"],
//   })
// );

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import quoteRoutes from "./routes/quote.js";
import uploadRoutes from "./routes/upload.js";
import askRoutes from "./routes/ask.js";
import finalizeRoutes from "./routes/finalize.js";

dotenv.config();

const app = express();

// Allow list of origins
const allowedOrigins = [
  "https://www.prompt2quote.com",
  "https://prompt2quote.com",
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

app.use("/api/quote", quoteRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ask", askRoutes);
app.use("/api/finalize", finalizeRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
