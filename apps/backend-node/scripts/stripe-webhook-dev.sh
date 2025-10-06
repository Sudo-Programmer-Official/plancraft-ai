#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-4000}
TARGET="localhost:${PORT}/api/stripe/webhook"
echo "🔌 Forwarding Stripe events to http://${TARGET}"
echo "👉 Keep this terminal open. Copy the printed webhook secret and export it in your env as STRIPE_WEBHOOK_SECRET before starting the server."
echo
stripe listen --forward-to "$TARGET" --print-secret

