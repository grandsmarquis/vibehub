# syntax=docker/dockerfile:1

# Production image: Next.js app in apps/web (standalone output, npm workspaces).
#
#   docker build -t vibehub-web .
#   docker run --rm -p 3000:3000 --env-file apps/web/.env.local vibehub-web

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install workspace dependencies (lockfile + every workspace package.json).
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
# `next` is not hoisted to the repo root; without this, `npx next` downloads the latest Next.js.
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/

ENV NODE_ENV=production
ENV PATH="/app/apps/web/node_modules/.bin:/app/node_modules/.bin:${PATH}"

# Placeholders so `next build` can read env without a real database.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=${DATABASE_URL}
ARG AUTH_SECRET=build-time-placeholder-min-32-chars-long
ENV AUTH_SECRET=${AUTH_SECRET}

RUN npm run build -w web

FROM base AS runner
ENV NODE_ENV=production
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
