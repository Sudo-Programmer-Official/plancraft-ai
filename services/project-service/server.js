import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import pluginRouter from "./src/routes/pluginRoutes.js";
import projectRouter from "./src/routes/projectRoutes.js";
import statusRouter from "./src/routes/statusRoutes.js";
import projectTaskRouter from "./src/routes/projectTaskRoutes.js";
import sprintRouter from "./src/routes/sprintRoutes.js";
import aiRouter from "./src/routes/aiRoutes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "project-service" }));

app.use("/v1/workspaces", pluginRouter);
app.use("/v1/projects", projectRouter);
app.use("/v1/projects", statusRouter); // nested statuses and sprints under projects
app.use("/v1/projects", sprintRouter);
app.use("/v1", projectTaskRouter);
app.use("/v1", aiRouter);

app.use(errorHandler);

const port = process.env.PORT || 4005;
app.listen(port, () => {
  console.log(`[project-service] listening on ${port}`);
});
