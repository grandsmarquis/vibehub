# Frontend (Next.js) — build from repository root:
#   docker build -t vibehub-web .
#   docker run --rm -p 3000:3000 --env-file apps/web/.env.local vibehub-web
#
# Requires lockfile workspace package.json paths (npm ci).

ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
# Workspace devDependencies (e.g. @tailwindcss/postcss) live under apps/web/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    npm run build -w web

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
