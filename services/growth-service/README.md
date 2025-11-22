# Growth Service

Automates investor outreach, lead generation, community posting, smart comments, DM/email scripts, prospect search, and engagement workflows. Uses ai-nlp-service for AI text generation and logs campaigns/outreach in Firestore.

## Dev
```
pnpm install
pnpm dev
```

## Env
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- AI_NLP_SERVICE_URL
- NODE_ENV

## Routes (POST under /api/growth)
- /campaign/create
- /campaign/:id/update
- /campaign/:id/delete
- /generate/outreach-message
- /generate/comment
- /generate/community-post
- /search/prospects
- /search/investors

Health: `GET /healthz`
