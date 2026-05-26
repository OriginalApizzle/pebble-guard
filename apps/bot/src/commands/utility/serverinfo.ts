import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { COLORS } from '@pebble-guard/shared';
import { prisma } from '@pebble-guard/database';

export class ServerInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'serverinfo' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder.setName('serverinfo').setDescription('View server information and statistics')
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const guild = interaction.guild!;
    await guild.fetch();

    const [totalCases, openTickets] = await Promise.all([
      prisma.case.count({ where: { guildId: guild.id } }),
      prisma.ticket.count({ where: { guildId: guild.id, status: { not: 'CLOSED' } } }),
    ]);

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '🌟 Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: '⭐ Boosts', value: `${guild.premiumSubscriptionCount}`, inline: true },
        { name: '📋 Total Cases', value: `${totalCases}`, inline: true },
        { name: '🎫 Open Tickets', value: `${openTickets}`, inline: true },
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
