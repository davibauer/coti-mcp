# ============================================================
# Stage 1: Builder — compiles TypeScript to JavaScript
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Build tools needed by native dependencies (solc, coti-ethers)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY index.ts server.ts registerTools.ts ./
COPY tools/ ./tools/

RUN npm run build

# ============================================================
# Stage 2: Production — lean image with only compiled output
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=10s \
  --start-period=20s \
  --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

USER node

ENV NODE_ENV=production \
    PORT=3000

CMD ["node", "build/server.js"]
