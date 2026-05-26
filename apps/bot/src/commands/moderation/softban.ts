import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';

export class SoftbanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'softban' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('softban')
        .setDescription('Softban a member (ban then unban to purge messages)')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to softban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member') as GuildMember | null;
    if (!target) return interaction.editReply({ embeds: [errorEmbed('Member not found')] });
    const reason = interaction.options.getString('reason') ?? undefined;

    try {
      const modCase = await (this.container.client as any).moderation.softban(
        interaction.guild!, target, interaction.user, { reason }
      );
      return interaction.editReply({ embeds: [successEmbed(`Softbanned ${target.user.tag}`, `Case #${modCase.caseNumber}`)] });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to softban member', err.message)] });
    }
  }
}
