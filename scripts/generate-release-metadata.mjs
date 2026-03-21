#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const versionFile = path.join(repoRoot, "version.json");

if (!fs.existsSync(versionFile)) {
  throw new Error(`Missing version file: ${versionFile}`);
}

const versionData = JSON.parse(fs.readFileSync(versionFile, "utf8"));
const version = versionData?.version?.toString().trim();

if (!version) {
  throw new Error('version.json must include a non-empty "version" field');
}

const outputArg = process.env.RELEASE_OUTPUT || "release.json";
const outputPath = path.isAbsolute(outputArg)
  ? outputArg
  : path.resolve(process.cwd(), outputArg);

const metadata = {
  platform: process.env.RELEASE_PLATFORM || "unknown",
  version,
  build: process.env.RELEASE_BUILD || "",
  commit: process.env.RELEASE_COMMIT || "",
  date: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(`Generated release metadata at ${outputPath}`);
