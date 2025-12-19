import { firestore } from "./src/services/firebase.js";
import { up as init } from "./migrations/001_init.js";

const migrations = [{ id: "001_init", up: init }];

async function run() {
  const db = firestore();
  const stateRef = db.collection("project_migrations").doc("_state");
  const snap = await stateRef.get();
  const applied = new Set(snap.exists ? snap.data()?.applied || [] : []);

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      console.log(`[migrate] skip ${migration.id} (already applied)`);
      continue;
    }
    console.log(`[migrate] applying ${migration.id}`);
    await migration.up(db);
    applied.add(migration.id);
    await stateRef.set({ applied: Array.from(applied) }, { merge: true });
  }
  console.log(`[migrate] done. applied: ${Array.from(applied).join(", ")}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
