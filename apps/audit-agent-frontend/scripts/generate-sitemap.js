#!/usr/bin/env node
/**
 * 🌐 PlanCraftAI Sitemap Generator
 * --------------------------------------------------
 * Generates sitemap.xml dynamically after build.
 * Includes static + blog routes from Firestore.
 * Works with Firebase Hosting / Vite / Netlify.
 */
/* eslint-env node */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";
import process from "process";

// 🧩 Firebase SDK (for dynamic blog URLs)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import admin from "firebase-admin";
import { readFileSync } from "fs";

const firebaseConfig = {
  projectId: "audit-agent-66451", // ✅ only projectId required for Firestore fetch
};
const serviceAccountPath = join(process.cwd(), "firebase-service-account.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function getBlogSlugs() {
  try {
    const snap = await db.collection("blogs").get();
    const slugs = snap.docs.map((d) => `/blog/${d.data()?.slug}`).filter(Boolean);
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
  const blogRoutes = await getBlogSlugs();

  const staticRoutes = [
    "/",
    "/dashboard",
    "/daily",
    "/weekly",
    "/monthly",
    "/journal",
    "/today",
    "/planner",
    "/timeline",
    "/blog",
    "/privacy-policy",
    "/terms",
    "/contact",
  ];

  const routes = [...staticRoutes, ...blogRoutes];
  const now = new Date().toISOString().slice(0, 10);

  const urls = routes
    .map((p) => {
      const priority =
        p === "/"
          ? "1.0"
          : p.startsWith("/blog/")
          ? "0.8"
          : "0.7";
      return `  <url>
    <loc>${SITE_URL}${p}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>`;

  // --------------------------------------------------
  // 🔹 Write output to /dist and /public
  // --------------------------------------------------
  const distDir = join(ROOT, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "sitemap.xml"), xml);

  const publicDir = join(ROOT, "public");
  try {
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
    writeFileSync(join(publicDir, "sitemap.xml"), xml);
  } catch (err) {
    console.warn("⚠️ Could not write to /public:", err.message);
  }

  console.log(`✅ sitemap.xml generated for ${routes.length} routes`);
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