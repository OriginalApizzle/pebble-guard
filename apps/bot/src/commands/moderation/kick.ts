import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';

export class KickCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'kick' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the kick'))
        .addBooleanOption(o => o.setName('silent').setDescription('Do not DM the member'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member') as GuildMember | null;
    if (!target) return interaction.editReply({ embeds: [errorEmbed('Member not found')] });
    if (!target.kickable) return interaction.editReply({ embeds: [errorEmbed('Cannot kick this member', 'They may have a higher role than the bot.')] });

    const reason = interaction.options.getString('reason') ?? undefined;
    const silent = interaction.options.getBoolean('silent') ?? false;

    try {
      const modCase = await (this.container.client as any).moderation.kick(
        interaction.guild!, target, interaction.user, { reason, silent }
      );
      return interaction.editReply({ embeds: [successEmbed(`Kicked ${target.user.tag}`, `Case #${modCase.caseNumber}`)] });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to kick member', err.message)] });
    }
  }
}
