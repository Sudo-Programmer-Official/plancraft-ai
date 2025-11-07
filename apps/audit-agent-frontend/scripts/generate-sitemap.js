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
import dotenv from "dotenv"
dotenv.config({ path: ".env.production" }) // choose your env file

import admin from "firebase-admin";
import { getMarketingRoutes, getRestrictedPaths } from "../../../shared/seo/routes.js";
import { buildSitemapXml, buildRobotsTxt } from "../../../shared/seo/generator.js";

const serviceAccountPath = join(process.cwd(), "firebase-service-account.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

console.log("🚨 Using API Base URL:", process.env.VITE_API_BASE_URL)
const apiUrl = process.env.VITE_API_BASE_URL
if (apiUrl === "undefined") {
  console.error("❌ Missing VITE_API_BASE_URL! Check .env or .env.production.")
  process.exit(1)
}
if (process.env.VITE_API_BASE_URL.includes("localhost")) {
  console.error("❌ ABORT: Localhost URL detected! Switch to production env.")
  process.exit(1)
}

const db = admin.firestore();

async function getBlogSlugs() {
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
const SITE_URL = "https://plancraftai.com";

// --------------------------------------------------
// 🔹 Firebase initialization
// --------------------------------------------------


// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// --------------------------------------------------
// 🔹 Fetch all blog slugs
// --------------------------------------------------
// async function getBlogSlugs() {
//   try {
//     const snap = await getDocs(collection(db, "blogs"));
//     const slugs = snap.docs
//       .map((d) => d.data()?.slug)
//       .filter(Boolean)
//       .map((slug) => `/blog/${slug}`);

//     console.log(`📝 Found ${slugs.length} blog posts`);
//     return slugs;
//   } catch (err) {
//     console.warn("⚠️ Failed to fetch blog slugs:", err.message);
//     return [];
//   }
// }

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
