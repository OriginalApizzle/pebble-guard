import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { prisma } from '@pebble-guard/database';

export class AutomodCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'automod' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('automod')
        .setDescription('Configure automod settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
          sub.setName('wordblacklist').setDescription('Manage word blacklist')
            .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }))
            .addStringOption(o => o.setName('word').setDescription('Word to add or remove'))
        )
        .addSubcommand(sub =>
          sub.setName('linkfilter').setDescription('Configure link filter')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
            .addStringOption(o => o.setName('whitelist').setDescription('Comma-separated domains to whitelist'))
        )
        .addSubcommand(sub =>
          sub.setName('spam').setDescription('Configure spam detection')
            .addIntegerOption(o => o.setName('threshold').setDescription('Messages before action (default: 5)').setMinValue(2).setMaxValue(20))
            .addIntegerOption(o => o.setName('interval').setDescription('Time window in seconds (default: 5)').setMinValue(1).setMaxValue(60))
        )
        .addSubcommand(sub =>
          sub.setName('massmention').setDescription('Configure mass mention limit')
            .addIntegerOption(o => o.setName('limit').setDescription('Max mentions before action').setMinValue(2).setMaxValue(50).setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('caps').setDescription('Configure caps filter')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
            .addIntegerOption(o => o.setName('threshold').setDescription('% caps to trigger (default: 70)').setMinValue(50).setMaxValue(100))
        )
        .addSubcommand(sub =>
          sub.setName('escalation').setDescription('Configure warning escalation')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
            .addIntegerOption(o => o.setName('warn_limit').setDescription('Warnings before escalation').setMinValue(2).setMaxValue(20))
            .addStringOption(o => o.setName('action').setDescription('Action on escalation').addChoices({ name: 'Mute', value: 'MUTE' }, { name: 'Kick', value: 'KICK' }, { name: 'Ban', value: 'BAN' }))
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand(true);
    const guildId = interaction.guild!.id;
    const config = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!config) return interaction.editReply({ embeds: [errorEmbed('Guild not configured. Run /config first.')] });

    switch (sub) {
      case 'wordblacklist': {
        const action = interaction.options.getString('action', true);
        if (action === 'list') {
          const list = config.wordBlacklist;
          return interaction.editReply({ content: list.length ? `**Blacklisted words:**\n${list.map(w => `• \`${w}\``).join('\n')}` : 'No words blacklisted.' });
        }
        const word = interaction.options.getString('word');
        if (!word) return interaction.editReply({ embeds: [errorEmbed('Please provide a word')] });
        const newList = action === 'add'
          ? [...new Set([...config.wordBlacklist, word.toLowerCase()])]
          : config.wordBlacklist.filter(w => w !== word.toLowerCase());
        await prisma.guild.update({ where: { id: guildId }, data: { wordBlacklist: newList } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed(`Word ${action === 'add' ? 'added to' : 'removed from'} blacklist`, `\`${word}\``)] });
      }
      case 'linkfilter': {
        const enabled = interaction.options.getBoolean('enabled', true);
        const whitelist = interaction.options.getString('whitelist')?.split(',').map(s => s.trim()) ?? config.linkWhitelist;
        await prisma.guild.update({ where: { id: guildId }, data: { linkFilterEnabled: enabled, linkWhitelist: whitelist } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed(`Link filter ${enabled ? 'enabled' : 'disabled'}`)] });
      }
      case 'spam': {
        const threshold = interaction.options.getInteger('threshold') ?? config.spamThreshold;
        const interval = interaction.options.getInteger('interval') ?? config.spamInterval;
        await prisma.guild.update({ where: { id: guildId }, data: { spamThreshold: threshold, spamInterval: interval } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed('Spam detection updated', `Threshold: ${threshold} messages in ${interval}s`)] });
      }
      case 'massmention': {
        const limit = interaction.options.getInteger('limit', true);
        await prisma.guild.update({ where: { id: guildId }, data: { massMentionLimit: limit } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed('Mass mention limit set', `${limit} mentions`)] });
      }
      case 'caps': {
        const enabled = interaction.options.getBoolean('enabled', true);
        const threshold = interaction.options.getInteger('threshold') ?? config.capsThreshold;
        await prisma.guild.update({ where: { id: guildId }, data: { capsFilterEnabled: enabled, capsThreshold: threshold } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed(`Caps filter ${enabled ? 'enabled' : 'disabled'}`, `Threshold: ${threshold}%`)] });
      }
      case 'escalation': {
        const enabled = interaction.options.getBoolean('enabled', true);
        const warnLimit = interaction.options.getInteger('warn_limit') ?? config.escalationWarnLimit;
        const action = (interaction.options.getString('action') ?? config.escalationAction) as any;
        await prisma.guild.update({ where: { id: guildId }, data: { escalationEnabled: enabled, escalationWarnLimit: warnLimit, escalationAction: action } });
        await (this.container.client as any).guildCache.invalidate(guildId);
        return interaction.editReply({ embeds: [successEmbed(`Escalation ${enabled ? 'enabled' : 'disabled'}`, `After ${warnLimit} warnings → ${action}`)] });
      }
      default:
        return interaction.editReply({ embeds: [errorEmbed('Unknown subcommand')] });
    }
  }
}
