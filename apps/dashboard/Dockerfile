FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.6.7 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @pebble-guard/database db:generate
RUN pnpm --filter @pebble-guard/dashboard build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public 2>/dev/null || true

USER node
EXPOSE 3000
ENV PORT 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/dashboard/server.js"]
