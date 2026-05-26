import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { parseDuration } from '@pebble-guard/shared';

export class WarnCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'warn' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('warn')
        .setDescription('Warn a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the warning'))
        .addStringOption(o => o.setName('duration').setDescription('How long the warning is active (e.g. 7d, 30d)'))
        .addStringOption(o => o.setName('evidence').setDescription('Evidence URL(s), comma-separated'))
        .addBooleanOption(o => o.setName('silent').setDescription('Do not DM the member'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('member') as GuildMember | null;
    if (!target) return interaction.editReply({ embeds: [errorEmbed('User not found')] });

    const reason = interaction.options.getString('reason') ?? undefined;
    const durationStr = interaction.options.getString('duration');
    const evidenceStr = interaction.options.getString('evidence');
    const silent = interaction.options.getBoolean('silent') ?? false;

    const duration = durationStr ? parseDuration(durationStr) : undefined;
    if (durationStr && !duration) {
      return interaction.editReply({ embeds: [errorEmbed('Invalid duration', 'Use format like `7d`, `24h`, `30m`')] });
    }

    const evidence = evidenceStr ? evidenceStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
      const result = await (this.container.client as any).moderation.warn(
        interaction.guild!,
        target.user,
        interaction.user,
        { reason, duration: duration ?? undefined, evidence, silent }
      );

      return interaction.editReply({
        embeds: [successEmbed(`Warned ${target.user.tag}`, `Case #${result.case.caseNumber}${reason ? `\nReason: ${reason}` : ''}`)],
      });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to warn member', err.message)] });
    }
  }
}
