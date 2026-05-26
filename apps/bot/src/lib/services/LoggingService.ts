import { Guild, TextChannel, EmbedBuilder, Message, GuildMember, VoiceState, Role } from 'discord.js';
import { SapphireClient } from '@sapphire/framework';
import { prisma, LogType } from '@pebble-guard/database';
import { COLORS, EMOJIS } from '@pebble-guard/shared';
import { logger } from '../utils/logger';

export class LoggingService {
  constructor(private client: SapphireClient) {}

  private async getLogChannel(guildId: string, channelKey: 'modLogChannelId' | 'msgLogChannelId' | 'joinLeaveChannelId' | 'voiceLogChannelId'): Promise<TextChannel | null> {
    try {
      const config = await prisma.guild.findUnique({ where: { id: guildId } });
      if (!config) return null;
      const channelId = config[channelKey];
      if (!channelId) return null;
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return null;
      return (guild.channels.cache.get(channelId) as TextChannel | undefined) ?? null;
    } catch {
      return null;
    }
  }

  private async storeLog(guildId: string, type: LogType, data: {
    userId?: string;
    userTag?: string;
    targetId?: string;
    targetType?: string;
    description: string;
    channelId?: string;
    messageId?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.logEntry.create({
      data: {
        guildId,
        type,
        ...data,
        metadata: data.metadata ?? {},
      },
    }).catch(() => null);
  }

  async logMessageDelete(message: Message) {
    if (!message.guild || message.author.bot) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.LOG} Message Deleted`)
      .addFields(
        { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*[No content / embed]*' }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    const channel = await this.getLogChannel(message.guild.id, 'msgLogChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    await this.storeLog(message.guild.id, LogType.MESSAGE_DELETE, {
      userId: message.author.id,
      userTag: message.author.tag,
      channelId: message.channelId,
      messageId: message.id,
      description: `Message deleted in <#${message.channelId}>`,
      metadata: { content: message.content?.slice(0, 4000) },
    });
  }

  async logMessageEdit(oldMessage: Message, newMessage: Message) {
    if (!newMessage.guild || newMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`${EMOJIS.LOG} Message Edited`)
      .addFields(
        { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
        { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
        { name: 'Before', value: (oldMessage.content?.slice(0, 512)) || '*[Empty]*' },
        { name: 'After', value: (newMessage.content?.slice(0, 512)) || '*[Empty]*' }
      )
      .setFooter({ text: `Message ID: ${newMessage.id}` })
      .setTimestamp();

    const channel = await this.getLogChannel(newMessage.guild.id, 'msgLogChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    await this.storeLog(newMessage.guild.id, LogType.MESSAGE_EDIT, {
      userId: newMessage.author.id,
      userTag: newMessage.author.tag,
      channelId: newMessage.channelId,
      messageId: newMessage.id,
      description: `Message edited in <#${newMessage.channelId}>`,
      metadata: { before: oldMessage.content, after: newMessage.content },
    });
  }

  async logMemberJoin(member: GuildMember) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Member Joined')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();

    const channel = await this.getLogChannel(member.guild.id, 'joinLeaveChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    // Update daily stats
    await this.updateDailyStats(member.guild.id, { joins: 1 });

    await this.storeLog(member.guild.id, LogType.MEMBER_JOIN, {
      userId: member.id,
      userTag: member.user.tag,
      description: `${member.user.tag} joined the server`,
    });
  }

  async logMemberLeave(member: GuildMember) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('Member Left')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None', inline: false }
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();

    const channel = await this.getLogChannel(member.guild.id, 'joinLeaveChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    await this.updateDailyStats(member.guild.id, { leaves: 1 });

    await this.storeLog(member.guild.id, LogType.MEMBER_LEAVE, {
      userId: member.id,
      userTag: member.user.tag,
      description: `${member.user.tag} left the server`,
    });
  }

  async logVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    let type: LogType | null = null;
    let description = '';

    if (!oldState.channelId && newState.channelId) {
      type = LogType.VOICE_JOIN;
      description = `${member.user.tag} joined voice channel <#${newState.channelId}>`;
    } else if (oldState.channelId && !newState.channelId) {
      type = LogType.VOICE_LEAVE;
      description = `${member.user.tag} left voice channel <#${oldState.channelId}>`;
    } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      type = LogType.VOICE_MOVE;
      description = `${member.user.tag} moved from <#${oldState.channelId}> to <#${newState.channelId}>`;
    } else if (!oldState.serverMute && newState.serverMute) {
      type = LogType.VOICE_MUTE;
      description = `${member.user.tag} was server muted`;
    } else {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.LOG} Voice ${type.replace('VOICE_', '')}`)
      .setDescription(description)
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp();

    const channel = await this.getLogChannel(member.guild.id, 'voiceLogChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    await this.storeLog(member.guild.id, type, {
      userId: member.id,
      userTag: member.user.tag,
      description,
    });
  }

  async logRoleUpdate(member: GuildMember, addedRoles: Role[], removedRoles: Role[], executor?: string) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.LOG} Role Update`)
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        ...(addedRoles.length ? [{ name: 'Added', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true }] : []),
        ...(removedRoles.length ? [{ name: 'Removed', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true }] : []),
        ...(executor ? [{ name: 'By', value: executor, inline: true }] : [])
      )
      .setTimestamp();

    const channel = await this.getLogChannel(member.guild.id, 'msgLogChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);
  }

  async logNicknameChange(member: GuildMember, oldNick: string | null, newNick: string | null) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(`${EMOJIS.LOG} Nickname Changed`)
      .addFields(
        { name: 'Member', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Before', value: oldNick ?? '*None*', inline: true },
        { name: 'After', value: newNick ?? '*Removed*', inline: true }
      )
      .setTimestamp();

    const channel = await this.getLogChannel(member.guild.id, 'msgLogChannelId');
    await channel?.send({ embeds: [embed] }).catch(() => null);

    await this.storeLog(member.guild.id, LogType.MEMBER_NICK_CHANGE, {
      userId: member.id,
      userTag: member.user.tag,
      description: `Nickname changed from "${oldNick}" to "${newNick}"`,
    });
  }

  async logBoost(member: GuildMember) {
    const config = await prisma.guild.findUnique({ where: { id: member.guild.id } });
    if (!config?.boostLogChannelId) return;

    const channel = member.guild.channels.cache.get(config.boostLogChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xff73fa)
      .setTitle('⭐ Server Boost!')
      .setDescription(`${member.user.tag} boosted the server! Total boosts: **${member.guild.premiumSubscriptionCount}**`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  }

  async getLogs(guildId: string, options: {
    type?: LogType;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { type, userId, page = 1, limit = 50 } = options;
    const where = {
      guildId,
      ...(type ? { type } : {}),
      ...(userId ? { userId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.logEntry.count({ where }),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  private async updateDailyStats(guildId: string, updates: Record<string, number>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const increment = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, { increment: v }])
    );

    await prisma.dailyStats.upsert({
      where: { guildId_date: { guildId, date: today } },
      create: { guildId, date: today, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v])) },
      update: increment,
    }).catch(() => null);
  }
}
