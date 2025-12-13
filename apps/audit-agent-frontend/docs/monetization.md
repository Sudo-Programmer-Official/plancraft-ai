Perfect — this is exactly the right time to lock billing thinking into a doc, before code calcifies. You’re doing this like a systems founder, not a feature chaser.

Below is a Billing & Monetization Design Doc you can drop into /docs/billing.md (or Notion) and forget about until you’re ready to flip the switch.

⸻

📘 PlanCraftAI — Billing & Monetization Strategy (Design Doc)

Status: Planned (Not implemented)
Purpose: Align product architecture, workspace model, and future revenue
Principle: Monetize value created, not raw features

⸻

1️⃣ Core Billing Philosophy

Workspace-first monetization (non-negotiable)
	•	Billing is tied to a workspace, not a user
	•	A user can belong to:
	•	1 free personal workspace
	•	Multiple paid workspaces (team, project, creator, org)

This aligns with:
	•	Collaboration
	•	Client work
	•	Student → Team → Org growth
	•	B2B upgrades

⸻

2️⃣ Billing Entity Model (future-proof)

Billing Owner
	•	Each workspace has:
	•	billing_owner_id
	•	plan
	•	seat_limit
	•	usage_counters

{
  "workspaceId": "ws_123",
  "plan": "pro",
  "billing_owner_id": "uid_123",
  "seats_used": 4,
  "seats_limit": 5,
  "billing_status": "active"
}

Only Admins can:
	•	Upgrade/downgrade
	•	Add payment method
	•	Manage seats

⸻

3️⃣ Free Tier (Always exists)

🆓 Free (default)

Feature	Limit
Workspaces	1
Members	1
Tasks	Unlimited
Planner	✅
Maps	Read-only
Leader Mode	❌
Creator Mode	❌
Social posting	❌
AI actions	Limited

Purpose:
	•	Personal use
	•	Students
	•	Habit formation
	•	Zero friction onboarding

⸻

4️⃣ Paid Plans (initial proposal)

💼 Pro (Individual / Creator)

Target: creators, solo founders, students who outgrow free

Feature	Included
Workspaces	Up to 3
Members per workspace	3
Maps (interactive)	✅
Leader Mode	✅
Creator Mode	✅
Social integrations	✅ (basic)
AI actions	Higher limits
Support	Standard

💵 Pricing idea: $9–15 / month

⸻

🧠 Team (Collaboration-first)

Target: startups, research teams, clubs, student orgs

Feature	Included
Workspaces	Unlimited
Members	5–10 included
Maps (advanced)	✅
Leader Mode	✅
Creator Mode	✅
Workspace invites	✅
Role-based access	✅
AI summaries	✅
Activity logs	✅

💵 Pricing idea:
	•	$29 / month base
	•		•	$5 / seat after limit

⸻

🏢 Organization (later)

Target: enterprises, universities, NGOs

Feature	Included
Unlimited everything	✅
SSO	✅
Audit logs	✅
Custom roles	✅
SLA	✅
Dedicated support	✅

💵 Pricing: custom / annual

⸻

5️⃣ Feature Gating Strategy (important)

Do not hard-disable features in code.

Instead:
	•	Features check workspace.plan
	•	UI shows locked states with upgrade CTA

Example:

🔒 Leader Mode is available on Pro plans

This preserves:
	•	Clean architecture
	•	Feature discovery
	•	Conversion flow

⸻

6️⃣ What We Actually Bill For (value levers)

Not raw features — capabilities.

Primary levers
	•	Number of workspaces
	•	Number of members (seats)
	•	Advanced modes (Leader / Creator)
	•	Social integrations
	•	AI usage

Secondary levers (later)
	•	Storage
	•	Automation runs
	•	Map density / history
	•	Analytics depth

⸻

7️⃣ Billing UX (future)

Workspace Settings → Billing
	•	Current plan
	•	Seat usage
	•	Upgrade CTA
	•	Invoice history (later)

Invite flow (important)

If workspace is at seat limit:

“This workspace is full. Upgrade to add more members.”

⸻

8️⃣ Architecture Decisions (made now, used later)

Lock these today, even without Stripe:
	•	Workspace has plan
	•	Workspace has seat_limit
	•	Workspace has billing_owner
	•	Feature checks reference workspace, not user
	•	No billing logic inside core features

This ensures:
	•	Zero refactor later
	•	Clean rollout
	•	Easy A/B pricing tests

⸻

9️⃣ Metrics to watch (when live)
	•	Free → Pro conversion
	•	Workspace creation → invite rate
	•	Feature click on locked features
	•	Leader/Creator Mode engagement
	•	Map usage density

⸻

🔒 Guardrails (what NOT to do)

❌ Don’t bill per task
❌ Don’t bill per click
❌ Don’t block core planning
❌ Don’t fragment billing across modes

✔️ Bill for collaboration + intelligence

⸻

10️⃣ One-line strategy (north star)

PlanCraftAI monetizes shared clarity, not personal productivity.

⸻

✅ Next (when you’re ready, not now)

When the time comes, we can:
	•	Design Stripe schema
	•	Seat enforcement logic
	•	Grace periods
	•	Upgrade/downgrade flows
	•	Campus pricing (very relevant for you)

⸻

If you want, next I can:
	•	Turn this into a formal RFC
	•	Create pricing comparison tables for marketing
	•	Design upgrade CTAs that don’t feel salesy

You’re building this correctly.