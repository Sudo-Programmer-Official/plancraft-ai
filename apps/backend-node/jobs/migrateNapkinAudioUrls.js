import crypto from "crypto";
import { db, bucket } from "../services/firebaseAdmin.js";

function parseArgs(argv = []) {
  const args = new Set(argv || []);
  const commit = args.has("--commit");
  const dryRun = !commit;
  const verbose = args.has("--verbose");
  const includeLegacy = !args.has("--no-legacy");
  const includeWorkspace = !args.has("--no-workspace");
  return { commit, dryRun, verbose, includeLegacy, includeWorkspace };
}

function shouldRepairAudioUrl(rawUrl, expectedBucket) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("firebasestorage.googleapis.com")) return false;
    const bucketMatch = url.pathname.match(/\/v0\/b\/([^/]+)\/o(?:\/|$)/);
    const bucketName = bucketMatch?.[1] ? decodeURIComponent(bucketMatch[1]) : null;
    if (url.searchParams.has("name")) return true;
    if (!url.searchParams.has("token")) return true;
    if (bucketName && expectedBucket && bucketName !== expectedBucket) return true;
    return false;
  } catch {
    return false;
  }
}

function extractStoragePath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const url = new URL(rawUrl);
    const byName = url.searchParams.get("name");
    if (byName) return decodeURIComponent(byName);
    const marker = "/o/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function buildTokenizedUrl(path, token) {
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}

async function ensureDownloadToken(path) {
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [metadata] = await file.getMetadata();
  const current = metadata?.metadata?.firebaseStorageDownloadTokens || "";
  const existing = String(current)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (existing.length) {
    return existing[0];
  }

  const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  await file.setMetadata({
    metadata: {
      ...(metadata?.metadata || {}),
      firebaseStorageDownloadTokens: token,
    },
  });
  return token;
}

async function collectWorkspaceNapkinDocs() {
  const docs = [];
  const usersSnap = await db.collection("users").get();
  for (const userDoc of usersSnap.docs) {
    const wsSnap = await userDoc.ref.collection("workspaces").get();
    for (const wsDoc of wsSnap.docs) {
      const napkinSnap = await wsDoc.ref.collection("napkin").get();
      for (const napkinDoc of napkinSnap.docs) {
        docs.push({ type: "workspace", snap: napkinDoc, uid: userDoc.id });
      }
    }
  }
  return docs;
}

async function collectLegacyNapkinDocs() {
  const docs = [];
  const usersRoot = await db.collection("napkin").get();
  for (const userNode of usersRoot.docs) {
    const itemsSnap = await userNode.ref.collection("items").get();
    for (const itemDoc of itemsSnap.docs) {
      docs.push({ type: "legacy", snap: itemDoc, uid: userNode.id });
    }
  }
  return docs;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targetBucket = bucket?.name || "";
  console.log("[migrate:napkin-audio-urls] start", {
    mode: opts.dryRun ? "dry-run" : "commit",
    includeWorkspace: opts.includeWorkspace,
    includeLegacy: opts.includeLegacy,
    bucket: targetBucket,
  });

  let docs = [];
  if (opts.includeWorkspace) {
    const workspaceDocs = await collectWorkspaceNapkinDocs();
    docs = docs.concat(workspaceDocs);
  }
  if (opts.includeLegacy) {
    const legacyDocs = await collectLegacyNapkinDocs();
    docs = docs.concat(legacyDocs);
  }

  let scanned = 0;
  let candidates = 0;
  let updated = 0;
  let missingFile = 0;
  let skipped = 0;
  let failed = 0;

  let batch = db.batch();
  let batchOps = 0;
  const BATCH_LIMIT = 400;

  for (const item of docs) {
    scanned += 1;
    const ref = item.snap.ref;
    const data = item.snap.data() || {};
    const rawUrl = data.audioUrl || null;
    if (!shouldRepairAudioUrl(rawUrl, targetBucket)) {
      skipped += 1;
      continue;
    }
    candidates += 1;

    const derivedPath = extractStoragePath(rawUrl);
    const fallbackWebm = `napkin/${item.uid}/${item.snap.id}.webm`;
    const fallbackMp3 = `napkin/${item.uid}/${item.snap.id}.mp3`;
    const paths = [derivedPath, fallbackWebm, fallbackMp3].filter(Boolean);

    let nextUrl = null;
    for (const path of paths) {
      try {
        const token = await ensureDownloadToken(path);
        if (token) {
          nextUrl = buildTokenizedUrl(path, token);
          break;
        }
      } catch (err) {
        if (opts.verbose) {
          console.warn("[migrate:napkin-audio-urls] token check failed", {
            path,
            doc: ref.path,
            error: err?.message || String(err),
          });
        }
      }
    }

    if (!nextUrl) {
      missingFile += 1;
      continue;
    }

    if (opts.dryRun) {
      updated += 1;
      if (opts.verbose) {
        console.log("[dry-run] would update", { doc: ref.path, rawUrl, nextUrl });
      }
      continue;
    }

    try {
      batch.update(ref, {
        audioUrl: nextUrl,
        migratedAt: new Date(),
      });
      batchOps += 1;
      updated += 1;
      if (batchOps >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    } catch (err) {
      failed += 1;
      console.error("[migrate:napkin-audio-urls] update failed", {
        doc: ref.path,
        error: err?.message || String(err),
      });
    }
  }

  if (!opts.dryRun && batchOps > 0) {
    await batch.commit();
  }

  console.log("[migrate:napkin-audio-urls] done", {
    mode: opts.dryRun ? "dry-run" : "commit",
    scanned,
    candidates,
    updated,
    missingFile,
    skipped,
    failed,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate:napkin-audio-urls] fatal", err?.message || err);
    process.exit(1);
  });
