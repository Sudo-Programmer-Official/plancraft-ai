import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.warn("[Version] Failed to read JSON file", { filePath, message: err?.message || String(err) });
    return null;
  }
}

function loadReleaseMetadata() {
  const candidates = [
    path.join(repoRoot, "apps", "audit-agent-frontend", "dist", "release.json"),
    path.join(repoRoot, "apps", "audit-agent-frontend", "public", "release.json"),
    path.join(repoRoot, "release.json"),
  ];

  for (const candidate of candidates) {
    const json = readJsonIfExists(candidate);
    if (json) {
      return { filePath: candidate, data: json };
    }
  }

  return { filePath: null, data: null };
}

router.get("/version", (_req, res) => {
  const versionJson = readJsonIfExists(path.join(repoRoot, "version.json"));
  const releaseMetadata = loadReleaseMetadata();

  return res.json({
    version: versionJson?.version || releaseMetadata.data?.version || null,
    build: process.env.RELEASE_BUILD || releaseMetadata.data?.build || null,
    commit: process.env.RELEASE_COMMIT || releaseMetadata.data?.commit || null,
    date: releaseMetadata.data?.date || null,
    platform: releaseMetadata.data?.platform || "server",
    sources: {
      versionJson: !!versionJson?.version,
      releaseMetadataFile: releaseMetadata.filePath || null,
      releaseBuildEnv: !!process.env.RELEASE_BUILD,
      releaseCommitEnv: !!process.env.RELEASE_COMMIT,
    },
  });
});

export default router;
