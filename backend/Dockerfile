# --- deps: install once, reused by both the build and runtime stages ---
FROM node:20-alpine AS deps
# Prisma's query/schema engine binaries need a real OpenSSL — without this,
# `prisma generate` (triggered by npm's postinstall) and `prisma migrate
# deploy` both fail to parse the engine's response on Alpine/musl.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- build: compile TypeScript ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime: slim image, prod deps only ---
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4000

# Applies any pending migrations before the new instance starts serving —
# keeps the schema in sync with the deployed code on every deploy.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
