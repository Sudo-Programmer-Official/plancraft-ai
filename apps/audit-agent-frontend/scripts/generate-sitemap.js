#!/usr/bin/env node
/**
 * 🌐 PlanCraftAI Sitemap Generator
 * --------------------------------------------------
 * Generates sitemap.xml dynamically after build.
 * Includes static + blog routes from Firestore.
 * Works with Firebase Hosting / Vite / Netlify.
 */
/* eslint-env node */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";
import process from "process";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getMarketingRoutes, getRestrictedPaths } from "../../../shared/seo/routes.js";
import { buildSitemapXml, buildRobotsTxt } from "../../../shared/seo/generator.js";

// Load env for production by default; allow override via SITEMAP_ENV_FILE
const envPath = process.env.SITEMAP_ENV_FILE || ".env.production";
dotenv.config({ path: envPath });

const rawSiteUrl = (process.env.VITE_SITE_URL && String(process.env.VITE_SITE_URL)) || "https://plancraftai.com";
const SITE_URL = rawSiteUrl.endsWith("/") ? rawSiteUrl.slice(0, -1) : rawSiteUrl;
const apiUrl = process.env.VITE_API_BASE_URL;

if (!apiUrl) {
  console.warn("ℹ️ VITE_API_BASE_URL is not set. Proceeding without API validation.");
} else if (apiUrl.includes("localhost")) {
  console.warn("ℹ️ Local API base detected; continuing but skipping API safety exit.");
} else {
  console.log("🌐 Using API Base URL:", apiUrl);
}

// Initialize Firebase admin if credentials are present
let db = null;
try {
  const serviceAccountPath = join(process.cwd(), "firebase-service-account.json");
  const serviceAccountJson = readFileSync(serviceAccountPath, "utf8");
  const serviceAccount = JSON.parse(serviceAccountJson);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  db = admin.firestore();
} catch (err) {
  console.warn("⚠️ Firebase admin not initialized; skipping blog slug fetch.", err.message);
}

async function getBlogSlugs() {
  if (!db) {
    console.warn("ℹ️ Firestore unavailable — sitemap will include marketing pages only.");
    return [];
  }
  try {
    const snap = await db.collection("blogs").get();
    const slugs = snap.docs
      .map((d) => {
        const data = d.data() || {}
        const slug = data.slug || d.id
        if (!slug) return null
        return {
          path: `/blog/${slug}`,
          changefreq: 'weekly',
          priority: 0.82,
        }
      })
      .filter(Boolean);
    console.log(`📝 Found ${slugs.length} blog posts`);
    return slugs;
  } catch (err) {
    console.warn("⚠️ Failed to fetch blog slugs:", err.message);
    return [];
  }
}
// --------------------------------------------------
// 🔹 Basic setup
// --------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// --------------------------------------------------
// 🔹 Generate sitemap.xml
// --------------------------------------------------
async function generateSitemap() {
  const marketingRoutes = getMarketingRoutes();
  const blogRoutes = await getBlogSlugs();
  const sitemapRoutes = [...marketingRoutes, ...blogRoutes];

  const xml = buildSitemapXml({
    baseUrl: SITE_URL,
    routes: sitemapRoutes,
  })

  const robots = buildRobotsTxt({
    allowPaths: marketingRoutes.map((r) => r.path),
    disallowPaths: getRestrictedPaths(),
    sitemapUrl: `${SITE_URL}/sitemap.xml`,
  })

  // --------------------------------------------------
  // 🔹 Write output to /dist and /public
  // --------------------------------------------------
  const distDir = join(ROOT, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "sitemap.xml"), xml);
  writeFileSync(join(distDir, "robots.txt"), robots);

  const publicDir = join(ROOT, "public");
  try {
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
    writeFileSync(join(publicDir, "sitemap.xml"), xml);
    writeFileSync(join(publicDir, "robots.txt"), robots);
  } catch (err) {
    console.warn("⚠️ Could not write to /public:", err.message);
  }

  console.log(`[SEO] sitemap generated for ${sitemapRoutes.length} routes`);
  await pingSearchEngines();
}

// --------------------------------------------------
// 🔹 Optional: Notify Google & Bing
// --------------------------------------------------
async function pingSearchEngines() {
  if (process.env.SKIP_SITEMAP_PING === "1") {
    console.log("ℹ️ SKIP_SITEMAP_PING=1 — skipping search engine pings.");
    return;
  }
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  console.log("\n🔔 Pinging search engines...\n");

  for (const ping of pingUrls) {
    await new Promise((resolve) => {
      https
        .get(ping, (res) => {
          const code = res.statusCode;
          const statusEmoji = code === 200 ? "✅" : code >= 400 ? "⚠️" : "ℹ️";
          console.log(`${statusEmoji} Pinged ${ping.split("/")[2]} (${code})`);
          resolve();
        })
        .on("error", (err) => {
          console.warn(`❌ Ping failed for ${ping}: ${err.message}`);
          resolve();
        });
    });
  }
}

// --------------------------------------------------
// 🚀 Run main
// --------------------------------------------------
generateSitemap()
  .then(() => {
    console.log("\n🎉 Sitemap generation completed successfully.\n");
  })
  .catch((e) => {
    console.error("❌ Sitemap generation failed:", e);
    process.exit(1);
  });
