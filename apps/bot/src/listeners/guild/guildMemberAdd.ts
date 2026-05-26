import { Listener, Events } from '@sapphire/framework';
import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '@pebble-guard/database';
import { COLORS } from '@pebble-guard/shared';
import { logger } from '../../lib/utils/logger';

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberAdd });
  }

  public async run(member: GuildMember) {
    const client = this.container.client as any;

    // Log the join
    await client.logging.logMemberJoin(member);

    const config = await prisma.guild.findUnique({ where: { id: member.guild.id } });
    if (!config) return;

    // Assign unverified role if verification is on
    if (config.verificationEnabled && config.unverifiedRoleId) {
      const role = member.guild.roles.cache.get(config.unverifiedRoleId);
      if (role) await member.roles.add(role).catch(() => null);
    }

    // Assign auto-roles on join
    const autoRoles = await prisma.autoRole.findMany({ where: { guildId: member.guild.id, onJoin: true } });
    for (const ar of autoRoles) {
      const role = member.guild.roles.cache.get(ar.roleId);
      if (role) {
        if (ar.delay > 0) {
          setTimeout(() => member.roles.add(role).catch(() => null), ar.delay * 1000);
        } else {
          await member.roles.add(role).catch(() => null);
        }
      }
    }

    // Welcome message
    if (config.welcomeEnabled && config.welcomeChannelId && config.welcomeMessage) {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel | undefined;
      if (channel) {
        const msg = config.welcomeMessage
          .replace('{user}', `<@${member.id}>`)
          .replace('{guild}', member.guild.name)
          .replace('{count}', member.guild.memberCount.toString())
          .replace('{tag}', member.user.tag);

        if (config.welcomeEmbed) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setDescription(msg)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp(),
            ],
          }).catch(() => null);
        } else {
          await channel.send(msg).catch(() => null);
        }
      }
    }

    // Raid detection
    await client.verification.handleRaidDetection(member.guild, member.id);

    // If raid mode is active, kick new joins or DM them
    if (config.raidMode) {
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle('⚠️ Server in Raid Mode')
              .setDescription(`**${member.guild.name}** is currently in raid protection mode. Please try joining again later.`)
              .setTimestamp(),
          ],
        }).catch(() => null);
        await member.kick('Raid mode active').catch(() => null);
      } catch { /* ignore */ }
    }
  }
}
