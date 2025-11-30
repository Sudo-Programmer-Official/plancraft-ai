import dotenv from "dotenv";
import { analyzeUser } from "../services/analyticsService.js";
import { db } from "../utils/firebase.js";

dotenv.config();

async function main() {
  const usersSnap = await db().collection("users").get();
  const docs = usersSnap.docs || [];
  console.log(`[habit-worker] analyzing ${docs.length} users`);

  for (const doc of docs) {
    const uid = doc.id;
    try {
      const result = await analyzeUser(uid);
      console.log(`[habit-worker] user=${uid} ok`, result.windowDays || "");
    } catch (err) {
      console.error("[habit-worker] failed", uid, err?.message || err);
    }
  }
}

main()
  .then(() => {
    console.log("[habit-worker] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[habit-worker] fatal", err);
    process.exit(1);
  });
