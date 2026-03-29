# syntax=docker/dockerfile:1
#
# Next.js frontend only (apps/web, standalone output).
#
#   docker build -t vibehub-web .
#   docker run --rm -p 3000:3000 --env-file apps/web/.env.local vibehub-web

FROM node:20-alpine AS base
WORKDIR /app

# --- install dependencies (npm workspaces: lockfile + every workspace manifest) ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/
RUN npm ci

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"

# Satisfy env reads during `next build` (no real DB required for this app)
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=${DATABASE_URL}
ARG AUTH_SECRET=build-time-placeholder-min-32-chars-long
ENV AUTH_SECRET=${AUTH_SECRET}

RUN npm run build -w web

# --- run standalone server ---
FROM base AS runner
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
