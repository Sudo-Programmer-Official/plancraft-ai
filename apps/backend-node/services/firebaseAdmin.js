import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getStorage } from "firebase-admin/storage";
import crypto from "crypto";


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

// Precompute bucket name if possible
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || undefined;
const ENV_BUCKET = "audit-agent-66451.firebasestorage.app";

console.log("🚨 Using Firebase Project ID:", PROJECT_ID || (serviceAccount ? serviceAccount.project_id : "none"))
console.log("🚨 Using Firebase Storage Bucket:", ENV_BUCKET || "none")
if (!admin.apps.length) {
  try {
    if (serviceAccount && typeof serviceAccount === "object") {
      const bucketName = ENV_BUCKET || (serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : undefined)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName,
      });
    } else {
      // Fallback to ADC if available (e.g., GOOGLE_APPLICATION_CREDENTIALS)
      console.warn(
        "⚠️ No explicit Firebase service account found. Attempting applicationDefault credentials."
      );
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: ENV_BUCKET,
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

// Storage bucket handle
// If ENV_BUCKET is not provided, fall back to the default bucket configured
// on initializeApp. Passing undefined to bucket(name) can behave inconsistently
// across environments, so prefer the zero-arg form when not set.
export const bucket = ENV_BUCKET ? getStorage().bucket(ENV_BUCKET) : getStorage().bucket();

// Helper: upload a Buffer and return a public URL
export async function uploadBufferToStorage(buffer, destPath, contentType = "image/png", makePublic = true) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("uploadBufferToStorage requires a Buffer");
  if (!destPath) throw new Error("destPath is required");
  if (!bucket) throw new Error("Firebase storage bucket is not initialized");
  const file = bucket.file(destPath);
  // Generate a Firebase download token for robust public access even with uniform bucket-level access
  const token = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'))

  // Use non-resumable upload to avoid 'No resume URL' issues on some networks
  try {
    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  } catch (err) {
    // Surface a clearer error for debugging
    const message = err?.message || String(err)
    console.error("❌ Failed to upload to Firebase Storage:", message)
    throw err
  }

  // Return v0 Firebase Storage URL with token (works regardless of ACL settings)
  // The Firebase Storage REST v0 API expects the full object path URL-encoded,
  // including slashes (e.g., `images%2Fcover.png`). Encode the entire path.
  const encodedPath = encodeURIComponent(destPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}
