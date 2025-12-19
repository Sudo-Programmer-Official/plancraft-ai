import express from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { createBillingIntent } from "../services/billingService.js";
import { getWorkspace } from "../services/workspaceService.js";

const router = express.Router();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" }) : null;

const PRICE_MAP = {
  starter: process.env.STRIPE_TEAM_STARTER_PRICE_ID,
  pro: process.env.STRIPE_TEAM_PRO_PRICE_ID,
};
const MIN_SEATS = 3;

function resolveBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.VITE_APP_URL ||
    process.env.PUBLIC_URL ||
    "https://plancraftai.com"
  ).replace(/\/+$/, "");
}

function resolveTeamPrice(plan = "starter") {
  const key = String(plan || "starter").toLowerCase();
  return PRICE_MAP[key] || null;
}

router.post("/billing/upgrade", requireAuth, async (req, res) => {
  try {
    const { workspaceId, plan, seatCount = 3 } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    const workspace = await getWorkspace(workspaceId);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    if (workspace.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Only the workspace owner can request an upgrade" });
    }

    const intent = await createBillingIntent({
      workspaceId,
      requestedPlan: plan || "pro",
      seatCount,
      createdBy: req.user.uid,
    });
    return res.status(201).json({ intent });
  } catch (err) {
    console.error("[BillingRoutes] upgrade intent failed", err?.message || err);
    return res.status(500).json({ error: "Failed to create upgrade intent" });
  }
});

router.post("/billing/checkout", requireAuth, async (req, res) => {
  try {
    const { workspaceId, plan = "starter", seatCount = 1, successUrl, cancelUrl } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    if (workspace.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Only the workspace owner can upgrade" });
    }

    const normalizedPlan = ["starter", "pro"].includes(String(plan || "").toLowerCase())
      ? String(plan).toLowerCase()
      : "starter";
    const priceId = resolveTeamPrice(normalizedPlan);
    if (!priceId) {
      return res.status(400).json({ error: "Stripe price not configured for this plan" });
    }
    const requestedSeats =
      Number.isFinite(Number(seatCount)) && Number(seatCount) > 0
        ? Math.floor(Number(seatCount))
        : Number(workspace.seats) || Number(workspace.seatLimit) || Number(workspace.seatsUsed) || MIN_SEATS;
    const seats = Math.max(MIN_SEATS, requestedSeats);
    const quantity = Math.max(1, Math.ceil(seats / MIN_SEATS));

    const baseUrl = resolveBaseUrl();
    const successRedirect =
      successUrl || `${baseUrl}/app?workspaceId=${workspaceId}&upgraded=${normalizedPlan}`;
    const cancelRedirect =
      cancelUrl ||
      `${baseUrl}/billing/upgrade?workspaceId=${workspaceId}&plan=${normalizedPlan}&status=cancel`;

    if (!stripe) {
      // Dev fallback: pretend checkout succeeded
      return res.json({ url: successRedirect });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      customer_email: req.user?.email || undefined,
      success_url: successRedirect,
      cancel_url: cancelRedirect,
      metadata: {
        workspaceId,
        plan: normalizedPlan,
        seats,
        seatQuantity: quantity,
        ownerId: req.user.uid,
        scope: "workspace",
      },
      subscription_data: {
        metadata: {
          workspaceId,
          plan: normalizedPlan,
          seats,
          seatQuantity: quantity,
          ownerId: req.user.uid,
          scope: "workspace",
        },
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("[BillingRoutes] checkout failed", err?.message || err);
    return res.status(500).json({ error: "Failed to start checkout" });
  }
});

export default router;
