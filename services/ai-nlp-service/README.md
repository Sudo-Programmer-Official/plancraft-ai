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

## Routes (POST under /api/ai)
- /generate/hook
- /generate/repurpose
- /generate/reel-script
- /generate/story-frame
- /generate/linkedin-post
- /generate/tweet-thread
- /generate/outreach-message

Health: `GET /healthz`
