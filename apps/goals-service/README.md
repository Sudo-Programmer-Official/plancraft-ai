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
