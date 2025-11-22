FROM node:20-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --production

COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
