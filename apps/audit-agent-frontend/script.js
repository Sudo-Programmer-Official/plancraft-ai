import sharp from "sharp";
import fs from "fs";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512, 180];
const input = "logo.png";

if (!fs.existsSync("public/icons")) {
  fs.mkdirSync("public/icons", { recursive: true });
}

sizes.forEach(async (size) => {
  const out = size === 180
    ? `public/icons/apple-touch-icon.png`
    : `public/icons/icon-${size}x${size}.png`;

  await sharp(input)
    .resize(size, size)
    .toFile(out);

  console.log(`✅ Generated ${out}`);
});