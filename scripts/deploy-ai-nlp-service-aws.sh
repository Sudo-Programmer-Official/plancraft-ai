#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
SERVICE_NAME="ai-nlp-service"

AWS_ACCOUNT_ID="<PLACEHOLDER>"
REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${SERVICE_NAME}"
TAG="latest"

echo "Building image..."
docker build -t "${SERVICE_NAME}:${TAG}" services/ai-nlp-service

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
          "OPENAI_API_KEY": "<fill>",
          "LOGGING_LEVEL": "info"
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
OPENAI_API_KEY=
LOGGING_LEVEL=info
EOF
