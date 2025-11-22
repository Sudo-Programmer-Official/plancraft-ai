# syntax=docker/dockerfile:1

FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --production

# Copy source
COPY . .

# Runtime port
EXPOSE 8080
CMD ["node", "server.js"]
