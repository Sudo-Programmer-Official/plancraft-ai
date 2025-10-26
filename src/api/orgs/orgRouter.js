import express from "express";
import { db } from "../../../server/firebaseAdmin.js";

const router = express.Router();

/** Utility to generate slug */
const slugify = (name) =>
  (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Create new organization
 * Seeds the owner into orgs/{orgId}/members/{uid}
 */
router.post("/", async (req, res) => {
  try {
    const { name, timezone = null } = req.body || {};
    const uid = req.user?.uid;

    if (!uid) return res.status(401).json({ error: "Unauthenticated" });
    if (!name) return res.status(400).json({ error: "Missing organization name" });

    const orgData = {
      name,
      slug: slugify(name),
      ownerUid: uid,
      plan: "free",
      createdAt: new Date(),
      settings: {
        join_policy: "invite",
        default_role: "member",
        timezone: timezone || null,
      },
    };

    // Create organization
    const orgRef = await db.collection("orgs").add(orgData);

    // Add owner to members subcollection
    await db.doc(`orgs/${orgRef.id}/members/${uid}`).set({
      uid,
      role: "owner",
      joinedAt: new Date(),
      name: req.user?.name || null,
      email: req.user?.email || null,
    });

    res.json({ id: orgRef.id, slug: orgData.slug });
  } catch (err) {
    console.error("❌ POST /api/orgs error:", err);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

/**
 * List all orgs the current user is a member of
 */
router.get("/", async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthenticated" });

    const snap = await db.collectionGroup("members").where("uid", "==", uid).get();

    const orgs = await Promise.all(
      snap.docs.map(async (d) => {
        const orgRef = d.ref.parent.parent; // reference to org
        const orgSnap = orgRef ? await orgRef.get() : null;

        return orgSnap?.exists
          ? {
              id: orgRef.id,
              role: d.get("role"),
              name: orgSnap.get("name"),
              slug: orgSnap.get("slug"),
              plan: orgSnap.get("plan"),
            }
          : null;
      })
    );

    res.json(orgs.filter(Boolean));
  } catch (err) {
    console.error("❌ GET /api/orgs error:", err);
    res.status(500).json({ error: "Failed to list organizations" });
  }
});

/**
 * Get all projects within an org (user must be a member)
 * GET /api/orgs/:orgId/projects
 */
router.get("/:orgId/projects", async (req, res) => {
  try {
    const { orgId } = req.params;
    const uid = req.user?.uid;

    if (!uid) return res.status(401).json({ error: "Unauthenticated" });
    if (!orgId) return res.status(400).json({ error: "Missing orgId" });

    // Check if user is a member of the org
    const memberSnap = await db.doc(`orgs/${orgId}/members/${uid}`).get();
    if (!memberSnap.exists) {
      return res.status(403).json({ error: "Access denied: not a member of this org" });
    }

    // Fetch all projects under this org
    const projectsSnap = await db
      .collection("projects")
      .where("orgId", "==", orgId)
      .orderBy("createdAt", "desc")
      .get();

    const projects = projectsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(projects);
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/projects error:", err);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

export default router;