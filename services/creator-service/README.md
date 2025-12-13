# Creator Service

Purpose: manage creator plans (ContentCampaign) and proxy AI generation via ai-nlp-service.

## Endpoints
- `POST /creator/plan/create` – create draft campaign
- `PUT /creator/plan/:id` – update campaign
- `GET /creator/plan/:id` – fetch campaign
- `POST /creator/ai/hook|repurpose|reel-script|story-frames|thread|linkedin-post` – AI helpers
- `POST /creator/posts/validate` – validate canonical draft for platform readiness

## Dev
```
pnpm install
pnpm dev
```

## Env
See `.env.example`. Requires Firebase Admin credentials and AI service URL.

## AWS App Runner Deployment
1) Create an ECR repo for `creator-service` in `us-east-1`.
2) `docker login` to ECR.
3) Run `./scripts/deploy-creator-service-aws.sh` to build/tag/push `latest`.
4) Create an App Runner service pointing to the ECR image:
   - Region: `us-east-1`
   - Port: `8080`
   - CPU: 1 vCPU, Memory: 1 GB
5) Set environment variables:
   - NODE_ENV=production
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY
   - AI_NLP_SERVICE_URL (base of ai-nlp-service, e.g., https://<ai-service>/api/ai)
   - SERVICE_APP_TOKEN (shared secret; must match ai-nlp-service)
   - APP_TOKEN (same value as SERVICE_APP_TOKEN for backward compatibility)
   - CORS_ALLOW_ALL=1 (optional; keep 0 to lock down origins)
6) Health check endpoint: `/healthz`.
