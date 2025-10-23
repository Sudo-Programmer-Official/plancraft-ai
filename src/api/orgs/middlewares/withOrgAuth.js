import { db } from '../../../../server/firebaseAdmin.js';

export const withOrgAuth = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' });

    const memberRef = db.doc(`orgs/${orgId}/members/${uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) return res.status(403).json({ error: 'Not member' });

    req.orgRole = memberSnap.data().role;
    next();
  } catch (err) {
    console.error('withOrgAuth error', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
};

export default withOrgAuth;
