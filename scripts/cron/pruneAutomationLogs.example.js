// Example cron script: prune automation logs older than N days
import admin from 'firebase-admin';

const RETENTION_DAYS = parseInt(process.env.AUTOMATION_LOG_RETENTION_DAYS || '30', 10);

function init() {
  if (admin.apps.length) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } else {
    admin.initializeApp();
  }
}

async function pruneLogs() {
  init();
  const db = admin.firestore();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const snap = await db
    .collectionGroup('automationLogs')
    .where('createdAt', '<', new Date(cutoff))
    .limit(500)
    .get();

  if (snap.empty) {
    console.log('No automation logs to prune.');
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Pruned ${snap.size} automation logs older than ${RETENTION_DAYS} days.`);
}

pruneLogs().then(() => process.exit(0)).catch((err) => {
  console.error('Prune failed', err);
  process.exit(1);
});

