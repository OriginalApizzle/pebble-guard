#!/usr/bin/env bash
set -e
echo "🛡️  PebbleGuard — production start"
pnpm --filter @pebble-guard/database migrate:deploy
node apps/bot/dist/index.js &
node apps/dashboard/.next/standalone/apps/dashboard/server.js &
wait
