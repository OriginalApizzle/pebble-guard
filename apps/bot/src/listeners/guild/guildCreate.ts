import { Listener, Events } from '@sapphire/framework';
import { Guild } from 'discord.js';
import { prisma } from '@pebble-guard/database';
import { logger } from '../../lib/utils/logger';

export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildCreate });
  }

  public async run(guild: Guild) {
    logger.info(`Joined guild: ${guild.name} (${guild.id}) | Members: ${guild.memberCount}`);
    await prisma.guild.upsert({
      where: { id: guild.id },
      create: { id: guild.id, name: guild.name, ownerId: guild.ownerId },
      update: { name: guild.name },
    }).catch(() => null);
  }
}
