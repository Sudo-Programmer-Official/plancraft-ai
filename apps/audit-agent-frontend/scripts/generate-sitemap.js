#!/usr/bin/env node
/**
 * 🌐 PlanCraftAI Sitemap Generator
 * --------------------------------------------------
 * Generates sitemap.xml dynamically after build.
 * Includes static + blog routes from Firestore.
 * Works with Firebase Hosting / Vite / Netlify.
 */
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

async function cleanupResources() {
  try {
    if (db && typeof db.terminate === "function") {
      await db.terminate();
    }
  } catch (err) {
    console.warn("⚠️ Firestore terminate skipped:", err.message);
  }

  if (admin.apps.length) {
    await Promise.all(
      admin.apps.map((app) =>
        app.delete().catch((err) => {
          console.warn("⚠️ Firebase app delete skipped:", err.message);
        }),
      ),
    );
  }

  if (https.globalAgent && typeof https.globalAgent.destroy === "function") {
    https.globalAgent.destroy();
  }
}

async function getBlogSlugs() {
  if (!db) {
    console.warn("ℹ️ Firestore unavailable — sitemap will include marketing pages only.");
    return [];
  }
  try {
    const snap = await db.collection("blogs").where("published", "==", true).get();
    const seen = new Set();
    const slugs = snap.docs
      .map((d) => {
        const data = d.data() || {}
        const slug = String(data.slug || "").trim().toLowerCase()
        const title = String(data.title || "").trim()
        const summary = String(data.summary || "").trim()
        const content = String(data.content || "").trim()
        const slugLooksIndexable = /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug) && slug.length >= 8
        const contentLooksIndexable =
          title.length >= 16 && (summary.length >= 60 || content.replace(/<[^>]+>/g, " ").length >= 250)
        if (!slugLooksIndexable || !contentLooksIndexable) return null

        const dedupeKey = slug.replace(/-\d+$/, "")
        if (seen.has(dedupeKey)) return null
        seen.add(dedupeKey)

        const updatedAt = data.updated_at?.toDate ? data.updated_at.toDate() : data.updated_at || data.created_at
        const lastmod = (() => {
          try {
            const value = updatedAt?.toDate ? updatedAt.toDate() : new Date(updatedAt)
            return Number.isNaN(value?.getTime?.()) ? undefined : value.toISOString().slice(0, 10)
          } catch {
            return undefined
          }
        })()

        return {
          path: `/blog/${slug}`,
          changefreq: 'weekly',
          priority: 0.82,
          lastmod,
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
      const request = https.get(ping, (res) => {
          res.resume();
          const code = res.statusCode;
          const statusEmoji = code === 200 ? "✅" : code >= 400 ? "⚠️" : "ℹ️";
          console.log(`${statusEmoji} Pinged ${ping.split("/")[2]} (${code})`);
          res.on("end", resolve);
        })
        .on("error", (err) => {
          console.warn(`❌ Ping failed for ${ping}: ${err.message}`);
          resolve();
        });

      request.setTimeout(5000, () => {
        request.destroy(new Error("timeout"));
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
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupResources();
  });
