import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectIdEnv =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  null;
if (projectIdEnv && !process.env.GOOGLE_CLOUD_PROJECT)
  process.env.GOOGLE_CLOUD_PROJECT = projectIdEnv;
if (projectIdEnv && !process.env.GCLOUD_PROJECT)
  process.env.GCLOUD_PROJECT = projectIdEnv;

function decodeBase64Maybe(value) {
  if (!value || typeof value !== "string") return value;
  const base64ish = /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
  if (!base64ish) return value;
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return value;
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let key = decodeBase64Maybe(raw) || raw;
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
      if (!parsed?.project_id && projectIdEnv) parsed.project_id = projectIdEnv;
      console.info("[GoalsService] Using FIREBASE_SERVICE_ACCOUNT env (base64)");
      return parsed;
    } catch (_) {
      // ignore and try raw JSON
    }
    // Try raw JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
      if (!parsed?.project_id && projectIdEnv) parsed.project_id = projectIdEnv;
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
      projectId: projectIdEnv || serviceAccount.project_id,
    });
  } else {
    // Fallback to env trio if present
    if (projectIdEnv && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectIdEnv,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
        projectId: projectIdEnv,
      });
    } else {
      console.warn("[GoalsService] Falling back to applicationDefault Firebase credentials");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectIdEnv,
      });
    }
  }
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export default admin;
