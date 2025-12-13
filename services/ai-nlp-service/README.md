# AI NLP Service

Handles AI generation for hooks, repurposing, reels scripts, story frames, LinkedIn posts, tweet threads, and outreach messages.

## Dev
```
pnpm install
pnpm dev
```

## Env
- OPENAI_API_KEY
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- LOGGING_LEVEL
- NODE_ENV
- SERVICE_APP_TOKEN (shared secret; must match creator-service APP_TOKEN)
- APP_TOKEN (same value as SERVICE_APP_TOKEN for backward compatibility)
- CORS_ALLOW_ALL=1 (optional; set 0 to restrict to allowlist)

## Routes (POST under /api/ai)
- /generate/hook
- /generate/repurpose
- /generate/reel-script
- /generate/story-frame
- /generate/linkedin-post
- /generate/tweet-thread
- /generate/outreach-message
- /images/generate (AI image generation)

Health: `GET /healthz`
