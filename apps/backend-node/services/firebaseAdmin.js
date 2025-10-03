import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// __dirname is not available in ESM; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount = null;

// 1. If FIREBASE_SERVICE_ACCOUNT env is set (Render style), parse it
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env", err);
  }
}

// 2. Otherwise, fallback to local JSON file
if (!serviceAccount) {
  try {
    const localPath = path.resolve(__dirname, "../firebase-service-account.json");
    serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to load local firebase-service-account.json", err);
  }
}

if (!admin.apps.length) {
  try {
    if (serviceAccount && typeof serviceAccount === "object") {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } else {
      // Fallback to ADC if available (e.g., GOOGLE_APPLICATION_CREDENTIALS)
      console.warn(
        "⚠️ No explicit Firebase service account found. Attempting applicationDefault credentials."
      );
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (e) {
    console.error(
      "❌ Firebase admin initialization failed. Provide FIREBASE_SERVICE_ACCOUNT or firebase-service-account.json",
      e
    );
    throw e;
  }
}

export const db = admin.firestore();
