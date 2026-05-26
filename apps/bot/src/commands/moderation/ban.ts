import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, User } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { parseDuration, formatDuration } from '@pebble-guard/shared';

export class BanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'ban' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('ban')
        .setDescription('Ban a member or user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
        .addStringOption(o => o.setName('duration').setDescription('Temp ban duration (e.g. 7d, 30d). Leave empty for permanent'))
        .addIntegerOption(o => o.setName('delete_days').setDescription('Delete messages from last X days (0-7)').setMinValue(0).setMaxValue(7))
        .addBooleanOption(o => o.setName('silent').setDescription('Do not DM the user'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user', true);
    const member = interaction.options.getMember('user') as GuildMember | null;
    const reason = interaction.options.getString('reason') ?? undefined;
    const durationStr = interaction.options.getString('duration');
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
    const silent = interaction.options.getBoolean('silent') ?? false;

    const duration = durationStr ? parseDuration(durationStr) ?? undefined : undefined;
    if (durationStr && !duration) return interaction.editReply({ embeds: [errorEmbed('Invalid duration')] });

    if (member && !member.bannable) return interaction.editReply({ embeds: [errorEmbed('Cannot ban this member')] });

    try {
      const target = member ?? user;
      const modCase = await (this.container.client as any).moderation.ban(
        interaction.guild!, target, interaction.user, { reason, duration, deleteMessageDays: deleteDays, silent }
      );
      return interaction.editReply({
        embeds: [successEmbed(`Banned ${user.tag}`, `${duration ? `Duration: ${formatDuration(duration)}\n` : ''}Case #${modCase.caseNumber}`)],
      });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to ban user', err.message)] });
    }
  }
}
