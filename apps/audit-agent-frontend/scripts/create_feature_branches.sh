#!/bin/bash

# Start from develop
git checkout develop
git pull origin develop

# List of feature branches
branches=(
  "feature/voice-input"
  "feature/log-card"
  "feature/logs-ui"
  "feature/ui-polish"
  "feature/planner-enhance"
  "feature/settings-ui"
  "feature/404-loading"
  "feature/logs-api"
  "feature/firebase-admin"
  "feature/gpt-formatter-api"
  "feature/logs-by-date"
  "feature/auth-middleware"
  "feature/error-utils"
  "feature/mood-detector"
  "feature/whisper-api"
  "feature/reminders"
)

# Loop and create + push branches
for branch in "${branches[@]}"
do
  echo "🔧 Creating and pushing $branch..."
  git checkout -b $branch
  git push -u origin $branch
done

# Return to develop
git checkout develop

echo "✅ All feature branches created and pushed!"