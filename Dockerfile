FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
ENV MCP_TRANSPORT=stdio

EXPOSE 3001 3002

CMD ["node", "dist/index.js"]
