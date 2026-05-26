import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { env } from './env';
import { logger } from './lib/utils/logger';
import '@sapphire/plugin-hmr/register';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
  ],
  logger: {
    level: env.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Info,
  },
  loadMessageCommandListeners: false,
  defaultPrefix: '!',
  caseInsensitiveCommands: true,
  caseInsensitivePrefixes: true,
  hmr: {
    enabled: env.NODE_ENV === 'development',
  },
});

async function main() {
  try {
    logger.info('Starting PebbleGuard Bot...');
    await client.login(env.DISCORD_TOKEN);
    logger.info('PebbleGuard Bot is online!');
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  client.destroy();
  process.exit(0);
});

main();
