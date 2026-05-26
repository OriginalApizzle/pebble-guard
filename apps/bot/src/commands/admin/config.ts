import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../lib/utils/embeds';
import { prisma } from '@pebble-guard/database';
import { COLORS } from '@pebble-guard/shared';

export class ConfigCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'config' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('config')
        .setDescription('Configure PebbleGuard settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
          sub.setName('view').setDescription('View current configuration')
        )
        .addSubcommand(sub =>
          sub.setName('modlog').setDescription('Set the moderation log channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel for mod logs').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('msglog').setDescription('Set the message log channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel for message logs').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('joinlog').setDescription('Set the join/leave log channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('mutedrole').setDescription('Set the muted role')
            .addRoleOption(o => o.setName('role').setDescription('Muted role').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('staffrole').setDescription('Set the staff role')
            .addRoleOption(o => o.setName('role').setDescription('Staff role').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('verifiedrole').setDescription('Set the verified role')
            .addRoleOption(o => o.setName('role').setDescription('Verified role').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('welcome').setDescription('Configure welcome messages')
            .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').setRequired(true))
            .addStringOption(o => o.setName('message').setDescription('Welcome message. Use {user}, {guild}, {count}'))
        )
        .addSubcommand(sub =>
          sub.setName('automod').setDescription('Toggle automod')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('verification').setDescription('Toggle verification module')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('raidmode').setDescription('Toggle raid mode manually')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand(true);
    const guildId = interaction.guild!.id;

    let config = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!config) {
      config = await prisma.guild.create({
        data: { id: guildId, name: interaction.guild!.name, ownerId: interaction.guild!.ownerId },
      });
    }

    const update = async (data: Record<string, unknown>) => {
      await prisma.guild.update({ where: { id: guildId }, data });
      await (this.container.client as any).guildCache.invalidate(guildId);
    };

    switch (sub) {
      case 'view': {
        const embed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`⚙️ PebbleGuard Config — ${interaction.guild!.name}`)
          .addFields(
            { name: '📋 Mod Log', value: config.modLogChannelId ? `<#${config.modLogChannelId}>` : 'Not set', inline: true },
            { name: '💬 Message Log', value: config.msgLogChannelId ? `<#${config.msgLogChannelId}>` : 'Not set', inline: true },
            { name: '👋 Join/Leave Log', value: config.joinLeaveChannelId ? `<#${config.joinLeaveChannelId}>` : 'Not set', inline: true },
            { name: '🔇 Muted Role', value: config.mutedRoleId ? `<@&${config.mutedRoleId}>` : 'Not set', inline: true },
            { name: '👮 Staff Role', value: config.staffRoleId ? `<@&${config.staffRoleId}>` : 'Not set', inline: true },
            { name: '✅ Verified Role', value: config.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : 'Not set', inline: true },
            { name: '🤖 AutoMod', value: config.automodEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🛡️ Verification', value: config.verificationEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🚨 Raid Mode', value: config.raidMode ? '🔴 ACTIVE' : '🟢 Off', inline: true },
            { name: '🎫 Tickets', value: config.ticketsEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📊 Analytics', value: config.analyticsEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
      case 'modlog': {
        const channel = interaction.options.getChannel('channel', true);
        await update({ modLogChannelId: channel.id });
        return interaction.editReply({ embeds: [successEmbed('Mod log channel set', `<#${channel.id}>`)] });
      }
      case 'msglog': {
        const channel = interaction.options.getChannel('channel', true);
        await update({ msgLogChannelId: channel.id });
        return interaction.editReply({ embeds: [successEmbed('Message log channel set', `<#${channel.id}>`)] });
      }
      case 'joinlog': {
        const channel = interaction.options.getChannel('channel', true);
        await update({ joinLeaveChannelId: channel.id });
        return interaction.editReply({ embeds: [successEmbed('Join/leave log channel set', `<#${channel.id}>`)] });
      }
      case 'mutedrole': {
        const role = interaction.options.getRole('role', true);
        await update({ mutedRoleId: role.id });
        return interaction.editReply({ embeds: [successEmbed('Muted role set', `<@&${role.id}>`)] });
      }
      case 'staffrole': {
        const role = interaction.options.getRole('role', true);
        await update({ staffRoleId: role.id });
        return interaction.editReply({ embeds: [successEmbed('Staff role set', `<@&${role.id}>`)] });
      }
      case 'verifiedrole': {
        const role = interaction.options.getRole('role', true);
        await update({ verifiedRoleId: role.id });
        return interaction.editReply({ embeds: [successEmbed('Verified role set', `<@&${role.id}>`)] });
      }
      case 'welcome': {
        const channel = interaction.options.getChannel('channel', true);
        const message = interaction.options.getString('message') ?? 'Welcome {user} to **{guild}**! You are member #{count}.';
        await update({ welcomeChannelId: channel.id, welcomeMessage: message, welcomeEnabled: true });
        return interaction.editReply({ embeds: [successEmbed('Welcome configured', `Channel: <#${channel.id}>`)] });
      }
      case 'automod': {
        const enabled = interaction.options.getBoolean('enabled', true);
        await update({ automodEnabled: enabled });
        return interaction.editReply({ embeds: [successEmbed(`AutoMod ${enabled ? 'enabled' : 'disabled'}`)] });
      }
      case 'verification': {
        const enabled = interaction.options.getBoolean('enabled', true);
        await update({ verificationEnabled: enabled });
        return interaction.editReply({ embeds: [successEmbed(`Verification ${enabled ? 'enabled' : 'disabled'}`)] });
      }
      case 'raidmode': {
        const enabled = interaction.options.getBoolean('enabled', true);
        await update({ raidMode: enabled });
        return interaction.editReply({ embeds: [successEmbed(`Raid mode ${enabled ? '🔴 ACTIVATED' : '🟢 deactivated'}`)] });
      }
      default:
        return interaction.editReply({ embeds: [errorEmbed('Unknown subcommand')] });
    }
  }
}
