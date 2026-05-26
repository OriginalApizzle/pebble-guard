# 🛡️ PebbleGuard

**Full-featured Discord moderation, ticketing, verification, and administration bot — built for PebbleHost.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14-blue.svg)](https://discord.js.org/)

---

## ✨ Features

### 🔨 Moderation
- Full case management system (`/warn`, `/mute`, `/timeout`, `/kick`, `/ban`, `/softban`, `/unban`)
- Case history, notes, and evidence attachments
- Auto-escalation (X warnings → mute/kick/ban)
- Appeal system for users
- Temporary punishments with auto-expiry

### 🎫 Ticket System
- Multi-category support with custom labels, emojis, and department roles
- Claim, close, rename, add/remove users from tickets
- Priority levels (Low, Normal, High, Urgent)
- Transcript generation
- Auto-close on inactivity
- Escalation to higher staff

### 🛡️ Verification
- Button-click or CAPTCHA verification
- Min account age requirement
- Anti-alt detection
- Auto-raid mode (detects mass joins and engages automatically)
- Custom verification embed message

### 🤖 AutoMod
- Word blacklist
- Link filter with whitelist
- Discord invite filter
- Spam detection (rate limiting)
- Mass mention protection
- Caps filter
- Warning escalation

### 📋 Logging
- Message delete / edit logs
- Member join / leave logs
- Voice state logs (join, leave, move, mute)
- Role update logs
- Nickname change logs
- Boost notifications
- All logs stored in database for dashboard access

### 📊 Analytics
- Daily stats (joins, leaves, messages, punishments, tickets)
- Staff performance leaderboard
- Case breakdown by type
- Ticket status distribution
- 30-day growth charts

### 🌐 Dashboard
- Discord OAuth login
- Server selector
- Per-server config management
- Live case browser
- Ticket management
- Audit log viewer
- AutoMod configuration
- Verification settings
- API key management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL
- Redis
- A Discord application (bot + OAuth2)

### 1. Clone & Install

```bash
git clone https://github.com/OriginalApizzle/pebble-guard.git
cd pebble-guard
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Fill in all values in .env
```

Required variables:
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | OAuth2 Client ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 Client Secret |
| `NEXTAUTH_SECRET` | Random 32+ char string |
| `NEXTAUTH_URL` | Dashboard public URL |

### 3. Database Setup

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to DB (dev)
# OR for production:
pnpm db:migrate    # Run migrations
```

### 4. Development

```bash
pnpm dev-bot        # Run bot only
pnpm dev-dashboard  # Run dashboard only
pnpm dev            # Run both
```

### 5. Production Build

```bash
pnpm build
```

---

## 🐧 PebbleHost Deployment

### Bot (Node.js Hosting)

1. Upload the entire repo to your PebbleHost bot server
2. Set startup command to: `node apps/bot/dist/index.js`
3. Set environment variables in the panel's **Startup** tab
4. Run install command: `npm install -g pnpm && pnpm install && pnpm db:generate && pnpm build`

### Dashboard (can be deployed on Vercel, Railway, or a VPS)

1. Connect your GitHub repo to Vercel
2. Set root directory to `apps/dashboard`
3. Add all environment variables
4. Deploy

---

## 🤖 Bot Setup

1. Create a bot at [discord.com/developers](https://discord.com/developers)
2. Enable all **Privileged Gateway Intents** (Members, Presence, Message Content)
3. Set OAuth2 Redirect URI to: `https://your-dashboard.com/api/auth/callback/discord`
4. Invite bot with: `https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot%20applications.commands`

---

## 📟 Bot Commands

| Command | Description |
|---|---|
| `/warn` | Warn a member |
| `/timeout` | Timeout a member (up to 28 days) |
| `/kick` | Kick a member |
| `/ban` | Ban a user (supports temp bans) |
| `/softban` | Ban+unban to purge messages |
| `/unban` | Unban a user |
| `/cases list` | View a user's case history |
| `/cases view` | View a specific case |
| `/cases delete` | Delete a case (admin) |
| `/appeal` | Appeal a moderation case |
| `/ticket panel` | Create ticket panel |
| `/ticket close` | Close current ticket |
| `/ticket claim` | Claim current ticket |
| `/ticket add/remove` | Manage ticket participants |
| `/ticket category create` | Create ticket category |
| `/verify panel` | Create verification panel |
| `/verify code` | Submit CAPTCHA code |
| `/config` | Configure bot settings |
| `/automod` | Configure automod |
| `/userinfo` | View user information |
| `/serverinfo` | View server statistics |

---

## 🏗️ Project Structure

```
pebble-guard/
├── apps/
│   ├── bot/                    # Discord bot (Sapphire + discord.js)
│   │   └── src/
│   │       ├── commands/       # Slash commands
│   │       ├── listeners/      # Event handlers
│   │       ├── lib/
│   │       │   ├── services/   # Business logic
│   │       │   ├── structures/ # Extended client
│   │       │   ├── cache/      # Redis caching
│   │       │   └── utils/      # Helpers
│   │       └── index.ts
│   └── dashboard/              # Next.js 14 dashboard
│       └── src/
│           ├── app/            # App Router pages + API routes
│           └── components/     # React components
├── packages/
│   ├── database/               # Prisma schema + client
│   └── shared/                 # Shared types, constants, utils
└── .env.example
```

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
