# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY extensions/vibehub/package.json extensions/vibehub/package.json
# Lockfile was generated on macOS; npm ci may not lay down the Linux lightningcss native optional.
# Install the matching lightningcss-* binding for this image (glibc vs musl, x64 vs arm64).
RUN npm ci \
  && (npm install -w web lightningcss-linux-x64-gnu@1.32.0 --no-save \
      || npm install -w web lightningcss-linux-arm64-gnu@1.32.0 --no-save \
      || npm install -w web lightningcss-linux-x64-musl@1.32.0 --no-save \
      || npm install -w web lightningcss-linux-arm64-musl@1.32.0 --no-save) \
  && cd apps/web && node -e "require('lightningcss')"

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web apps/web
COPY packages/db packages/db
COPY extensions/vibehub extensions/vibehub
# Lockfile nests deps under workspaces (e.g. next in apps/web/node_modules); root-only copy drops them.
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/extensions/vibehub/node_modules ./extensions/vibehub/node_modules
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
