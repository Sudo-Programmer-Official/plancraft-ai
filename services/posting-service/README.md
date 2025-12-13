# Posting Service

Unified publisher for Instagram, Facebook, LinkedIn, Twitter with scheduling.

## Endpoints
- `POST /publish` – publish now or schedule (stores in scheduled_posts)
- `POST /cron/publish-now` – process due scheduled posts
- `GET /tokens/:userId` – retrieve stored social tokens
- `POST /tokens/:userId` – save/refresh tokens

## Dev
```
pnpm install
pnpm dev
```

Configure provider keys in `.env.example`.

## Deploy to AWS App Runner (us-east-1)
1) Ensure AWS_ACCOUNT_ID is exported locally and AWS CLI is logged in.
2) Run `./scripts/deploy-posting-service-aws.sh` (builds, tags `latest`, pushes to ECR).
3) Create App Runner service using the printed AWS CLI command:
   - Image: `…amazonaws.com/posting-service:latest`
   - Port: `8080`
   - CPU: 1 vCPU, Memory: 1 GB, Region: `us-east-1`
   - Environment variables:
     - FIREBASE_PROJECT_ID
     - FIREBASE_CLIENT_EMAIL
     - FIREBASE_PRIVATE_KEY
     - META_APP_ID (Facebook/Meta App ID for OAuth)
     - META_APP_SECRET
     - INSTAGRAM_REDIRECT_URL
     - INSTAGRAM_SCOPES (optional override)
     - INSTAGRAM_APP_ID (Graph-only; not used for OAuth)
     - INSTAGRAM_APP_SECRET
     - INSTAGRAM_PAGE_ID
     - INSTAGRAM_ACCESS_TOKEN
     - LINKEDIN_CLIENT_ID
     - LINKEDIN_CLIENT_SECRET
     - LINKEDIN_ORG_ID
     - TWITTER_CLIENT_ID
     - TWITTER_CLIENT_SECRET
     - FB_PAGE_ACCESS_TOKEN
   - Set `NODE_ENV=production`
4) Test `https://<apprunner-url>/healthz` with proper auth on protected routes.
