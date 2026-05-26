import { Listener, Events } from '@sapphire/framework';
import { Client, ActivityType } from 'discord.js';
import { logger } from '../../lib/utils/logger';
import { prisma } from '@pebble-guard/database';

export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, once: true, event: Events.ClientReady });
  }

  public async run(client: Client<true>) {
    logger.info(`Logged in as ${client.user.tag} (${client.user.id})`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    client.user.setActivity(`${client.guilds.cache.size} servers | /help`, { type: ActivityType.Watching });

    // Sync guilds to DB
    for (const [, guild] of client.guilds.cache) {
      await prisma.guild.upsert({
        where: { id: guild.id },
        create: { id: guild.id, name: guild.name, ownerId: guild.ownerId },
        update: { name: guild.name },
      }).catch(() => null);
    }

    setInterval(() => {
      client.user.setActivity(`${client.guilds.cache.size} servers | /help`, { type: ActivityType.Watching });
    }, 10 * 60 * 1000);
  }
}
