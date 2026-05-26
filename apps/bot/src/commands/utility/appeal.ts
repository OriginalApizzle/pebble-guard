import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';

export class AppealCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'appeal' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('appeal')
        .setDescription('Appeal a moderation case')
        .addIntegerOption(o => o.setName('case').setDescription('Case number to appeal').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for appeal').setRequired(true))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const caseNum = interaction.options.getInteger('case', true);
    const reason = interaction.options.getString('reason', true);

    try {
      await (this.container.client as any).moderation.submitAppeal(
        interaction.guild!.id, caseNum, interaction.user.id, reason
      );
      return interaction.editReply({
        embeds: [successEmbed('Appeal Submitted', `Your appeal for Case #${caseNum} has been submitted and will be reviewed by staff.`)],
      });
    } catch (err: any) {
      return interaction.editReply({ embeds: [errorEmbed('Appeal Failed', err.message)] });
    }
  }
}
