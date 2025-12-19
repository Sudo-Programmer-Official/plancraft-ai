import admin from "firebase-admin";

let appInstance = null;

function init() {
  if (appInstance) return appInstance;
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  appInstance = admin.app();
  return appInstance;
}

export function firestore() {
  init();
  return admin.firestore();
}
