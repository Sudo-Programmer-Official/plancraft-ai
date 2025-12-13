import admin from "firebase-admin";
import "../services/firebaseAdmin.js"; // ensure admin initializes
import { backfillLocations } from "../services/locationService.js";

async function run() {
  const batchSize = Number(process.env.LOCATION_MIGRATION_BATCH || 400);
  console.log(`Starting location backfill with batchSize=${batchSize}...`);
  try {
    const { processed, updated } = await backfillLocations(batchSize);
    console.log(`Location backfill complete. processed=${processed}, updated=${updated}`);
  } catch (err) {
    console.error("Location backfill failed:", err?.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await admin.app().delete();
    } catch {
      /* noop */
    }
  }
}

run();
