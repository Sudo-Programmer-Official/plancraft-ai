FROM node:20-slim AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --omit=dev || npm install --production

FROM base AS runner
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
