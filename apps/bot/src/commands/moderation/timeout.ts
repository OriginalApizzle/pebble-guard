import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { parseDuration, formatDuration } from '@pebble-guard/shared';

export class TimeoutCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'timeout' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('timeout')
        .setDescription('Timeout a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to timeout').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
        .addBooleanOption(o => o.setName('silent').setDescription('Do not DM the member'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('member') as GuildMember | null;
    if (!target) return interaction.editReply({ embeds: [errorEmbed('Member not found')] });

    const durationStr = interaction.options.getString('duration', true);
    const duration = parseDuration(durationStr);

    if (!duration) return interaction.editReply({ embeds: [errorEmbed('Invalid duration', 'Use `10m`, `1h`, `1d`, `7d`, etc.')] });
    if (duration > 28 * 24 * 60 * 60 * 1000) return interaction.editReply({ embeds: [errorEmbed('Max timeout is 28 days')] });

    const reason = interaction.options.getString('reason') ?? undefined;
    const silent = interaction.options.getBoolean('silent') ?? false;

    try {
      const modCase = await (this.container.client as any).moderation.timeout(
        interaction.guild!, target, interaction.user, duration, { reason, silent }
      );
      return interaction.editReply({
        embeds: [successEmbed(`Timed out ${target.user.tag}`, `Duration: ${formatDuration(duration)}\nCase #${modCase.caseNumber}`)],
      });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to timeout member', err.message)] });
    }
  }
}
