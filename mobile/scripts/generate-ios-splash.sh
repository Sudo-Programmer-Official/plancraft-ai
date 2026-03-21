#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
LOGO_FILE="${REPO_DIR}/apps/audit-agent-frontend/public/logo-bg-remove.png"
ASSET_DIR="${ROOT_DIR}/ios/App/App/Assets.xcassets/Splash.imageset"
OUTPUT_FILE="${ROOT_DIR}/assets/splash-2732.png"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required. Install it with: brew install imagemagick" >&2
  exit 1
fi

if [ ! -f "${LOGO_FILE}" ]; then
  echo "Missing logo file: ${LOGO_FILE}" >&2
  exit 1
fi

mkdir -p "${ROOT_DIR}/assets" "${ASSET_DIR}"

magick \
  -size 2732x2732 gradient:'#26185f-#0e67d5' \
  \( -size 2732x2732 radial-gradient:'#8b5cf655-#8b5cf600' -blur 0x70 \) \
  -compose screen -composite \
  \( -size 2732x2732 radial-gradient:'#38bdf822-#38bdf800' -blur 0x110 \) \
  -compose screen -composite \
  \( "${LOGO_FILE}" -resize 760x760 \) \
  -gravity center -composite \
  "${OUTPUT_FILE}"

cp "${OUTPUT_FILE}" "${ASSET_DIR}/splash-2732x2732.png"
cp "${OUTPUT_FILE}" "${ASSET_DIR}/splash-2732x2732-1.png"
cp "${OUTPUT_FILE}" "${ASSET_DIR}/splash-2732x2732-2.png"

echo "Generated iOS splash assets from ${LOGO_FILE}"
echo "Base asset: ${OUTPUT_FILE}"
echo "Updated image set: ${ASSET_DIR}"
