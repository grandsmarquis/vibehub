# Next.js standalone image for the `web` workspace.
# Build from the repository root (monorepo layout + outputFileTracingRoot):
#   docker build -f apps/web/Dockerfile -t vibehub-web .
#
# Run (pass env vars for DB, auth, etc. — see apps/web/.env.example):
#   docker run --rm -p 3000:3000 --env-file apps/web/.env.local vibehub-web

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
# npm workspaces: lockfile links these paths; stubs are enough for `npm ci`.
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/
RUN npm ci --workspace=web --include=dev

FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages/db/package.json ./packages/db/
COPY extensions/vibehub/package.json ./extensions/vibehub/

WORKDIR /repo/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
