const admin = require('firebase-admin');
const IORedis = require('ioredis');

let firestoreInstance;
let redisConnection;

const getFirebaseApp = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[marketing-agent] Missing Firebase credentials, falling back to default application credentials');
    admin.initializeApp();
    return admin.app();
  }

  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  return admin.app();
};

const getFirestore = () => {
  if (!firestoreInstance) {
    firestoreInstance = getFirebaseApp().firestore();
  }

  return firestoreInstance;
};

const getRedisConnection = () => {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    redisConnection.on('error', (err) => {
      console.error('[marketing-agent] Redis error', err);
    });
  }

  return redisConnection;
};

module.exports = {
  getFirestore,
  getRedisConnection,
};
