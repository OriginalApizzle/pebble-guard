import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed } from '../../lib/utils/embeds';
import { COLORS } from '@pebble-guard/shared';

export class CasesCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'cases' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('cases')
        .setDescription('View moderation cases')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(sub =>
          sub.setName('list').setDescription('List cases for a user')
            .addUserOption(o => o.setName('user').setDescription('User to look up').setRequired(true))
            .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1))
        )
        .addSubcommand(sub =>
          sub.setName('view').setDescription('View a specific case')
            .addIntegerOption(o => o.setName('case').setDescription('Case number').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('delete').setDescription('Delete a case')
            .addIntegerOption(o => o.setName('case').setDescription('Case number').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'list') {
      const user = interaction.options.getUser('user', true);
      const page = interaction.options.getInteger('page') ?? 1;

      const { cases, total, totalPages } = await (this.container.client as any).moderation.getCases(
        interaction.guild!.id, user.id, page
      );

      if (!cases.length) return interaction.editReply({ embeds: [errorEmbed(`No cases found for ${user.tag}`)] });

      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`Cases for ${user.tag}`)
        .setDescription(cases.map((c: any) =>
          `**#${c.caseNumber}** — ${c.type} | ${c.reason ?? 'No reason'} | <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>`
        ).join('\n'))
        .setFooter({ text: `Page ${page}/${totalPages} | Total: ${total}` });

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === 'view') {
      const caseNum = interaction.options.getInteger('case', true);
      const modCase = await (this.container.client as any).moderation.getCase(interaction.guild!.id, caseNum);
      if (!modCase) return interaction.editReply({ embeds: [errorEmbed('Case not found')] });

      const embed = new EmbedBuilder()
        .setColor(COLORS.MODERATION)
        .setTitle(`Case #${modCase.caseNumber} — ${modCase.type}`)
        .addFields(
          { name: 'User', value: `${modCase.userTag} (${modCase.userId})`, inline: true },
          { name: 'Moderator', value: `${modCase.moderatorTag}`, inline: true },
          { name: 'Reason', value: modCase.reason ?? 'No reason', inline: false },
          { name: 'Active', value: modCase.active ? 'Yes' : 'No', inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(modCase.createdAt).getTime() / 1000)}:F>`, inline: true },
          ...(modCase.expiresAt ? [{ name: 'Expires', value: `<t:${Math.floor(new Date(modCase.expiresAt).getTime() / 1000)}:R>`, inline: true }] : []),
          ...(modCase.notes ? [{ name: 'Notes', value: modCase.notes }] : []),
          ...(modCase.evidence.length ? [{ name: 'Evidence', value: modCase.evidence.join('\n') }] : [])
        );

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === 'delete') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply({ embeds: [errorEmbed('You need Administrator to delete cases')] });
      }
      const caseNum = interaction.options.getInteger('case', true);
      await (this.container.client as any).moderation.deleteCase(interaction.guild!.id, caseNum, interaction.user.id);
      return interaction.editReply({ content: `✅ Case #${caseNum} has been deleted.` });
    }
  }
}
