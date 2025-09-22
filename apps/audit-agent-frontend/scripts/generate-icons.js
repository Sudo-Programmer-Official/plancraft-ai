// scripts/generate-icons.js
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  16, 32, 48, 64, 72, 96, 128, 144, 152, 192, 256, 384, 512, 1024,
];

const inputFile = path.join(__dirname, "../public/logo.png");
const outputDir = path.join(__dirname, "../public/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputFile).resize(size, size).toFile(outputFile);
    console.log(`✅ Generated: ${outputFile}`);
  }

  // Favicon (ICO format, 64x64 base)
  const faviconFile = path.join(outputDir, "../favicon.ico");
  await sharp(inputFile).resize(64, 64).toFile(faviconFile);
  console.log("✅ Generated favicon.ico");

  // Apple Touch Icon (required by iOS Safari, usually 180x180)
  const appleTouchFile = path.join(outputDir, "apple-touch-icon.png");
  await sharp(inputFile).resize(180, 180).toFile(appleTouchFile);
  console.log("🍏 Generated apple-touch-icon.png");

  console.log("🎉 All icons generated successfully!");
})();