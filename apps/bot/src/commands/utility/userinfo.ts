import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { COLORS } from '@pebble-guard/shared';
import { prisma } from '@pebble-guard/database';

export class UserInfoCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'userinfo' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('userinfo')
        .setDescription('View information about a user')
        .addUserOption(o => o.setName('user').setDescription('User to look up (defaults to you)'))
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.options.getMember('user') as GuildMember | null ?? interaction.member as GuildMember;

    const [caseCount, warnCount] = await Promise.all([
      prisma.case.count({ where: { guildId: interaction.guild!.id, userId: user.id } }),
      prisma.warning.count({ where: { guildId: interaction.guild!.id, userId: user.id, active: true } }),
    ]);

    const roles = member?.roles?.cache
      .filter(r => r.id !== interaction.guild!.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 10)
      .join(', ') ?? 'None';

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor ?? COLORS.INFO)
      .setTitle(`User Info — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '📥 Joined Server', value: member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Unknown', inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: '📋 Cases', value: `${caseCount}`, inline: true },
        { name: '⚠️ Active Warnings', value: `${warnCount}`, inline: true },
        { name: '🎭 Roles', value: roles || 'None', inline: false },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
