# ----------------------------
# 🚀 PlanCraft / Audit-Agent Monorepo Environment
# ----------------------------
FROM node:20-alpine AS base

# 1. Create workspace
WORKDIR /usr/src/app

# 2. Install global PNPM
RUN npm install -g pnpm@10.17.0

# 3. Copy only manifests first (leverage caching)
COPY pnpm-lock.yaml ./
COPY package.json ./

# 4. Install root dependencies
RUN pnpm install

# 5. Copy all source files
COPY . .

# 6. Build front-end + back-end
RUN pnpm --filter audit-agent-frontend build && pnpm --filter backend-node build

# 7. Expose ports for both servers
EXPOSE 3000 4000 5173

# 8. Default command for local dev
CMD ["pnpm", "dev"]