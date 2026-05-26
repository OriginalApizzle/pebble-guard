import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';

export class UnbanCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'unban' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('unban')
        .setDescription('Unban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the unban'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') ?? undefined;

    try {
      const modCase = await (this.container.client as any).moderation.unban(
        interaction.guild!, userId, interaction.user, { reason }
      );
      return interaction.editReply({ embeds: [successEmbed(`Unbanned user`, `Case #${modCase.caseNumber}`)] });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Failed to unban user', err.message)] });
    }
  }
}
