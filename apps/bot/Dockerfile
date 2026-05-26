FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.6.7 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules 2>/dev/null || true
COPY . .
RUN pnpm --filter @pebble-guard/database db:generate
RUN pnpm --filter @pebble-guard/shared build 2>/dev/null || true
RUN pnpm --filter @pebble-guard/bot build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@8.6.7 --activate
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/apps/bot/package.json ./apps/bot/

USER node
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/bot/dist/index.js"]
