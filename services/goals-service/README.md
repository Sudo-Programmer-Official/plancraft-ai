# PlanCraft Goals Service

A lightweight Express microservice that manages user goals, milestones, and progress tracking. It stores data in Firebase Firestore, can auto-generate milestones with OpenAI, and keeps tasks in sync with the existing planner service.

## Features

- CRUD endpoints under `/api/goals`
- AI-assisted milestone suggestions (`POST /api/goals/milestones/suggest`)
- Task linking + optional auto-creation via the planner task service
- Voice metadata + motivation note support for long-running goals

## Getting Started

```bash
cd apps/goals-service
cp .env.example .env
pnpm install
pnpm dev
```

The dev server defaults to `http://localhost:4502/api/goals`.

### Required Environment

- `FIREBASE_SERVICE_ACCOUNT` **or** `GOALS_FIREBASE_CREDENTIAL_PATH`
- `OPENAI_API_KEY` (only if AI milestone generation is desired)
- `GOALS_TASK_SERVICE_URL` (optional) → typically `http://localhost:4000/api/tasks/create`

Configure `GOALS_SERVICE_ALLOWED_ORIGINS` to match any frontend origins (Vite dev server, production domain, etc.).

## AWS App Runner Deployment
1) Create an ECR repo for `goals-service` in `us-east-1`.
2) `docker login` to ECR.
3) Run `./scripts/deploy-goals-service-aws.sh` to build/tag/push `latest`.
4) Create an App Runner service pointing to the ECR image:
   - Region: `us-east-1`
   - Port: `8080`
   - CPU: 1 vCPU, Memory: 1 GB
5) Set environment variables:
   - NODE_ENV=production
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY
6) Health check endpoint: `/healthz`.
