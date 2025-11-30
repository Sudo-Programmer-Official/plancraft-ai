import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let key = raw;
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");
  if (!/-----BEGIN PRIVATE KEY-----/.test(key)) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----\n`;
  }
  return key;
}

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
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    // Try base64 first
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID;
      console.info("[GoalsService] Using FIREBASE_SERVICE_ACCOUNT env (base64)");
      return parsed;
    } catch (_) {
      // ignore and try raw JSON
    }
    // Try raw JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID;
      console.info("[GoalsService] Using FIREBASE_SERVICE_ACCOUNT env (raw)");
      return parsed;
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
    // Fallback to env trio if present
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
    console.warn("[GoalsService] Falling back to applicationDefault Firebase credentials");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    }
  }
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
