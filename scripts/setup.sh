#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${CYAN}🛡️  PebbleGuard Setup${NC}"
echo "========================"

node_version=$(node -v 2>/dev/null || echo "not found")
if [[ "$node_version" == "not found" ]]; then echo -e "${RED}❌ Node.js not found. Install Node 18+${NC}"; exit 1; fi
echo -e "${GREEN}✅ Node $node_version${NC}"

if ! command -v pnpm &>/dev/null; then npm install -g pnpm@8; fi
echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${YELLOW}📋 .env created — fill in DATABASE_URL, DISCORD_TOKEN, etc. then press Enter${NC}"
  read -p ""
fi

echo -e "${CYAN}📦 Installing...${NC}"
pnpm install

echo -e "${CYAN}🗄️  DB setup...${NC}"
pnpm db:generate
pnpm db:push

echo -e "${GREEN}✅ Done! Run: pnpm dev${NC}"
