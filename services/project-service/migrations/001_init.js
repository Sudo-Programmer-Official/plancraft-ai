import { v4 as uuid } from "uuid";

export async function up(db) {
  const now = new Date().toISOString();
  const migrationId = "001_init";
  const metaRef = db.collection("project_migrations").doc(migrationId);
  await metaRef.set({ appliedAt: now, description: "Initialize project management collections", nonce: uuid() });
}
