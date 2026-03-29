# syntax=docker/dockerfile:1
# Build from repo root: docker build -t vibehub-web .
# Run: docker run --rm -p 3000:3000 --env-file apps/web/.env.local vibehub-web

FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY extensions/vibehub/package.json extensions/vibehub/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages/db/package.json packages/db/
COPY extensions/vibehub/package.json extensions/vibehub/

ENV NEXT_TELEMETRY_DISABLED=1
# Workspace bins (e.g. `next`) are hoisted to the repo root; npm's workspace
# script runs from apps/web without root .bin on PATH unless we add it.
ENV PATH="/app/node_modules/.bin:${PATH}"

# `next build` does not need a live DB for this app (routes are dynamic).
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=${DATABASE_URL}
ARG AUTH_SECRET=build-time-placeholder-min-32-chars-long
ENV AUTH_SECRET=${AUTH_SECRET}

ENV NODE_ENV=production
RUN npm run build -w web

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
