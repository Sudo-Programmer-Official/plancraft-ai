#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
SERVICE_NAME="creator-service"

AWS_ACCOUNT_ID="<PLACEHOLDER>"   # fill manually
REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${SERVICE_NAME}"
TAG="latest"

echo "Building image..."
docker build -t "${SERVICE_NAME}:${TAG}" services/creator-service

echo "Tagging..."
docker tag "${SERVICE_NAME}:${TAG}" "${REPO}:${TAG}"

echo "Pushing..."
docker push "${REPO}:${TAG}"

cat <<EOF

To create the App Runner service:

aws apprunner create-service \\
  --service-name ${SERVICE_NAME} \\
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'${REPO}:${TAG}'",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "FIREBASE_PROJECT_ID": "<fill>",
          "FIREBASE_CLIENT_EMAIL": "<fill>",
          "FIREBASE_PRIVATE_KEY": "<fill>",
          "AI_NLP_SERVICE_URL": "<fill>"
        }
      }
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "<ECR_ACCESS_ROLE_ARN>"
    }
  }' \\
  --instance-configuration Cpu="1 vCPU",Memory="1 GB" \\
  --region ${REGION}

Required environment variables:
NODE_ENV=production
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
AI_NLP_SERVICE_URL=
EOF
