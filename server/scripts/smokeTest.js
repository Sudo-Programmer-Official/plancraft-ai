import { db } from '../firebaseAdmin.js';

async function runSmokeTest() {
  console.log('🔥 Firestore Smoke Test Starting...');
  const testRef = db.collection('smokeTests').doc('demo');

  // Write
  await testRef.set({ hello: 'world', ts: new Date().toISOString() });
  console.log('✅ Write succeeded');

  // Read
  const doc = await testRef.get();
  console.log('📄 Read result:', doc.exists ? doc.data() : 'not found');

  // Delete
  await testRef.delete();
  console.log('🧹 Cleanup complete');

  console.log('🚀 Firestore smoke test passed!');
  process.exit(0);
}

runSmokeTest().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});