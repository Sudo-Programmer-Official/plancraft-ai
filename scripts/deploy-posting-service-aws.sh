#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
SERVICE_NAME="posting-service"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  echo "ERROR: Set AWS_ACCOUNT_ID in your environment." >&2
  exit 1
fi

ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${SERVICE_NAME}"
TAG="latest"

echo "Ensuring ECR repository exists: ${SERVICE_NAME}"
aws ecr describe-repositories --repository-names "${SERVICE_NAME}" --region "${REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${SERVICE_NAME}" --image-scanning-configuration scanOnPush=true --region "${REGION}"

echo "Logging into ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Building image from services/posting-service..."
docker build -t "${SERVICE_NAME}:${TAG}" services/posting-service

echo "Tagging image for ECR..."
docker tag "${SERVICE_NAME}:${TAG}" "${ECR_REPO}:${TAG}"

echo "Pushing image to ECR..."
docker push "${ECR_REPO}:${TAG}"

cat <<'EOF'
App Runner create/update (run after push):
aws apprunner create-service \
  --service-name posting-service \
  --source-configuration "ImageRepository={ImageIdentifier=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/posting-service:latest,ImageRepositoryType=ECR,ImageConfiguration={Port=8080,RuntimeEnvironmentVariables={NODE_ENV=production,FIREBASE_PROJECT_ID=<fill>,FIREBASE_CLIENT_EMAIL=<fill>,FIREBASE_PRIVATE_KEY=<fill>,INSTAGRAM_APP_ID=<fill>,INSTAGRAM_APP_SECRET=<fill>,INSTAGRAM_PAGE_ID=<fill>,INSTAGRAM_ACCESS_TOKEN=<fill>,LINKEDIN_CLIENT_ID=<fill>,LINKEDIN_CLIENT_SECRET=<fill>,LINKEDIN_ORG_ID=<fill>,TWITTER_CLIENT_ID=<fill>,TWITTER_CLIENT_SECRET=<fill>,FB_PAGE_ACCESS_TOKEN=<fill>}}}" \
  --instance-configuration Cpu=1 vCPU,Memory=1 GB \
  --region us-east-1

Required environment variables (App Runner):
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_PAGE_ID=
INSTAGRAM_ACCESS_TOKEN=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ORG_ID=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
FB_PAGE_ACCESS_TOKEN=
EOF
