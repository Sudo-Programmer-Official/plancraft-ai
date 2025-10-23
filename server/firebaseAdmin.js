import admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json) });
  }

  return admin.initializeApp();
}

export const firebaseApp = initFirebaseAdmin();
export const db = admin.firestore();

export default admin;

