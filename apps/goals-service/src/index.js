import dotenv from "dotenv";
import { createGoalsApp } from "./server.js";

const envFile = process.env.GOALS_ENV_FILE || ".env";
dotenv.config({ path: envFile });

const PORT = Number(process.env.GOALS_SERVICE_PORT || process.env.PORT || 4502);

const app = createGoalsApp();

app.listen(PORT, () => {
  const base = process.env.GOALS_SERVICE_BASE_PATH || "/api/goals";
  console.log(`🏁 Goals service listening on http://localhost:${PORT}${base}`);
});
