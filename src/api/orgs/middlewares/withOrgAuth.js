// import { db } from '../../../../server/firebaseAdmin.js';

// export const withOrgAuth = async (req, res, next) => {
//   try {
//     const { orgId } = req.params;
//     const uid = req.user?.uid;
//     if (!uid) return res.status(401).json({ error: 'Unauthenticated' });

//     const memberRef = db.doc(`orgs/${orgId}/members/${uid}`);
//     const memberSnap = await memberRef.get();
//     if (!memberSnap.exists) return res.status(403).json({ error: 'Not member' });

//     req.orgRole = memberSnap.data().role;
//     next();
//   } catch (err) {
//     console.error('withOrgAuth error', err);
//     res.status(500).json({ error: 'Auth check failed' });
//   }
// };

// export default withOrgAuth;

import { db } from "../../../../server/firebaseAdmin.js";

/**
 * Middleware: Verifies that the authenticated user
 * is a member of the requested organization.
 */
export const withOrgAuth = async (req, res, next) => {
  try {
    const orgId = String(req.params?.orgId || "").trim();
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!orgId) {
      return res.status(400).json({ error: "Missing organization ID" });
    }

    const memberRef = db.doc(`orgs/${orgId}/members/${uid}`);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return res.status(403).json({ error: "Access denied: not an organization member" });
    }

    const member = memberSnap.data();
    req.orgRole = member?.role || "member";

    return next();
  } catch (err) {
    console.error("❌ withOrgAuth error:", err);
    res.status(500).json({ error: "Organization auth check failed" });
  }
};

export default withOrgAuth;