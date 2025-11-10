Continue building the `marketing-agent` microservice created earlier.
Phase 2 introduces GPT-powered content generation, engagement tracking, and smart optimization.

# 🎯 GOAL
Upgrade the system so it can:
1. Auto-generate post/email/message content using OpenAI GPT models.
2. Personalize tone + CTA per platform.
3. Auto-reply to comments or messages with polite, helpful responses.
4. Analyze performance metrics and adjust future campaign frequency or topics.

---

# 🧱 NEW FOLDERS / FILES
apps/
  marketing-agent/
    src/
      ai/
        contentGenerator.js
        replyGenerator.js
        trendAnalyzer.js
      analytics/
        performanceAnalyzer.js
      scheduler/
        optimizer.js
      routes/
        aiRoutes.js

---

# 🧩 FUNCTIONAL MODULES

### 🧠 1. ai/contentGenerator.js
- Accepts a topic (e.g., "AI productivity tools", "founder journey") and platform.
- Calls OpenAI API (`gpt-4o-mini` or `gpt-4-turbo`) with custom prompt templates.
- Returns `{ headline, body, hashtags, cta }`.
- Store generated posts under `templates/generated/` for reuse.
- Supports tone styles: `"professional" | "casual" | "playful" | "motivational"`.

### 💬 2. ai/replyGenerator.js
- Reads incoming engagement (comments, messages) from `marketing_logs`.
- Generates short polite replies (max 200 chars).
- Queues responses back to the correct platform module.

### 📈 3. ai/trendAnalyzer.js
- Fetches trending topics per platform (mock API for now).
- Suggests new content themes weekly.
- Example: trending on Reddit → “AI agents”, trending on LinkedIn → “founder productivity”.

### 🧮 4. analytics/performanceAnalyzer.js
- Pulls `engagement_stats` from Firestore.
- Computes CTR, comment rate, share rate.
- Produces insights like: