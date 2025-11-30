# habit-service

Dedicated microservice for PlanCraftAI habit tracking, streaks, insights, and coaching.

## Endpoints
- `GET /api/habits/healthz` (in server root as `/healthz`)
- `GET /api/habits/` list habits (x-user-id)
- `POST /api/habits/` create habit `{ title, type?, category?, frequency? }`
- `PUT /api/habits/:id` update habit
- `DELETE /api/habits/:id` soft delete
- `POST /api/habits/:id/log` add daily log `{ date, count?, timezone?, source? }`
- `GET /api/habits/logs?date=YYYY-MM-DD` logs for day
- `GET /api/habits/insights/weekly` cached insights
- `GET /api/habits/insights/monthly` stub
- `POST /api/habits/insights/regenerate` rebuild insights
- `POST /api/habits/coach/message` AI coach message
- `POST /api/habits/internal/task-completed` (x-service-token) task hook → auto habit + log

Headers: `x-user-id` for user routes, `x-service-token` for internal. Optional `x-app-token` accepted for service token.

## Env
- `PORT` (default 8081)
- `ALLOWED_ORIGINS` comma list
- `CORS_ALLOW_ALL` default true
- `INTERNAL_SERVICE_TOKEN` or `API_SERVICE_TOKEN`
- `HABIT_ANALYTICS_WINDOW_DAYS` default 7
- `AI_ENDPOINT`, `AI_API_KEY` for coach
- `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_PROJECT_ID` for firebase-admin

## Jobs
`npm run worker` runs the analytics sweep (streak + consistency) and stores in `habit_summary`.

## Future hooks
- ML `ml/predictionStub.js` placeholder
- Auto-detection service can be expanded to pattern match recurring tasks and backfill logs.
