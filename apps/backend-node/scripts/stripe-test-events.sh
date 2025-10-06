#!/usr/bin/env bash
set -euo pipefail

echo "🚦 Triggering Stripe test events"
echo "Note: 'stripe listen' must be running and your backend using STRIPE_WEBHOOK_SECRET from it."

# Simulate a successful checkout
stripe trigger checkout.session.completed

# Simulate recurring invoice success
stripe trigger invoice.payment_succeeded

# Simulate cancellation / failure
# stripe trigger customer.subscription.deleted
# stripe trigger invoice.payment_failed

echo "✅ Done. Check your backend logs and Firestore 'users/{uid}' document."

