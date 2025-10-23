// Seed a personal org for a given user UID (one-time helper)
// Usage: node scripts/seed/seedPersonalOrg.example.js <uid> [name]

import admin from 'firebase-admin';

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

function slugify(name) {
  return (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  const [uid, nameArg] = process.argv.slice(2);
  if (!uid) {
    console.error('Usage: node scripts/seed/seedPersonalOrg.example.js <uid> [name]');
    process.exit(1);
  }
  const name = nameArg || `Personal - ${uid.slice(0, 6)}`;
  init();
  const db = admin.firestore();

  // Try to find existing owner org
  const existing = await db.collection('orgs').where('ownerUid', '==', uid).limit(1).get();
  let orgRef;
  if (!existing.empty) {
    orgRef = existing.docs[0].ref;
    console.log('Found existing org:', orgRef.id);
  } else {
    const orgDoc = {
      name,
      slug: slugify(name),
      ownerUid: uid,
      plan: 'free',
      createdAt: new Date(),
      settings: { join_policy: 'invite', default_role: 'member' },
    };
    orgRef = await db.collection('orgs').add(orgDoc);
    console.log('Created org:', orgRef.id);
  }

  // Ensure membership
  const memRef = db.doc(`orgs/${orgRef.id}/members/${uid}`);
  const memSnap = await memRef.get();
  if (!memSnap.exists) {
    await memRef.set({ uid, role: 'owner', joinedAt: new Date() });
    console.log('Seeded membership as owner');
  } else {
    console.log('Membership already exists');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

