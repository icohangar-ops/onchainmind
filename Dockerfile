FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
# Install all dependencies (including devDependencies) so the TypeScript
# compiler is available for the build step below.
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript, then drop devDependencies so the runtime image stays slim.
RUN npm run build && npm prune --omit=dev

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
