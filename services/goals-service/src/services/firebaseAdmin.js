import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveCredentialFromFile(candidatePath) {
  if (!candidatePath) return null;
  try {
    const absolute = path.resolve(__dirname, candidatePath);
    if (!fs.existsSync(absolute)) return null;
    return JSON.parse(fs.readFileSync(absolute, "utf-8"));
  } catch (err) {
    console.error("[GoalsService] Failed to read credential file", candidatePath, err?.message || err);
    return null;
  }
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (err) {
      console.error("[GoalsService] Invalid FIREBASE_SERVICE_ACCOUNT JSON", err?.message || err);
    }
  }

  const fromExplicitPath = resolveCredentialFromFile(process.env.GOALS_FIREBASE_CREDENTIAL_PATH);
  if (fromExplicitPath) return fromExplicitPath;

  const fallbackPath = "../../../backend-node/firebase-service-account.json";
  return resolveCredentialFromFile(fallbackPath);
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
  } else {
    console.warn("[GoalsService] Falling back to applicationDefault Firebase credentials");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
