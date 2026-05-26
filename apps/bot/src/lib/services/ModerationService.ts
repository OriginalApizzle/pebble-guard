import {
  Guild,
  GuildMember,
  User,
  TextChannel,
  EmbedBuilder,
  PermissionFlagsBits,
  time,
  TimestampStyles,
} from 'discord.js';
import { SapphireClient } from '@sapphire/framework';
import { prisma, PunishmentType } from '@pebble-guard/database';
import { COLORS, EMOJIS, formatDuration } from '@pebble-guard/shared';
import { modLogEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';

export interface PunishmentOptions {
  reason?: string;
  duration?: number; // ms
  evidence?: string[];
  notes?: string;
  silent?: boolean;
}

export class ModerationService {
  constructor(private client: SapphireClient) {}

  private async getNextCaseNumber(guildId: string): Promise<number> {
    const last = await prisma.case.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });
    return (last?.caseNumber ?? 0) + 1;
  }

  private async createCase(
    guildId: string,
    type: PunishmentType,
    userId: string,
    userTag: string,
    moderatorId: string,
    moderatorTag: string,
    options: PunishmentOptions = {}
  ) {
    const caseNumber = await this.getNextCaseNumber(guildId);
    const expiresAt = options.duration ? new Date(Date.now() + options.duration) : null;

    const modCase = await prisma.case.create({
      data: {
        caseNumber,
        guildId,
        type,
        userId,
        userTag,
        moderatorId,
        moderatorTag,
        reason: options.reason,
        evidence: options.evidence ?? [],
        notes: options.notes,
        duration: options.duration,
        expiresAt,
        active: true,
      },
    });

    // Track staff activity
    await prisma.staffActivity.create({
      data: {
        guildId,
        userId: moderatorId,
        userTag: moderatorTag,
        action: type,
        target: `${userTag} (${userId})`,
        metadata: { caseId: modCase.id, caseNumber, reason: options.reason },
      },
    });

    // Schedule expiry for temp punishments
    if (expiresAt) {
      await prisma.scheduledTask.create({
        data: {
          guildId,
          type: type === PunishmentType.MUTE ? 'UNMUTE' : type === PunishmentType.BAN ? 'UNBAN' : 'ROLE_REMOVE',
          data: { caseId: modCase.id, userId, guildId },
          executeAt: expiresAt,
        },
      });
    }

    return modCase;
  }

  async warn(
    guild: Guild,
    target: User,
    moderator: User,
    options: PunishmentOptions = {}
  ) {
    const modCase = await this.createCase(
      guild.id,
      PunishmentType.WARN,
      target.id,
      target.tag,
      moderator.id,
      moderator.tag,
      options
    );

    const warning = await prisma.warning.create({
      data: {
        guildId: guild.id,
        userId: target.id,
        userTag: target.tag,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        reason: options.reason,
        expiresAt: options.duration ? new Date(Date.now() + options.duration) : null,
      },
    });

    // DM the user
    if (!options.silent) {
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`${EMOJIS.WARN} You received a warning in ${guild.name}`)
              .addFields(
                { name: 'Reason', value: options.reason ?? 'No reason provided' },
                { name: 'Case', value: `#${modCase.caseNumber}` }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DMs disabled */ }
    }

    // Check escalation
    await this.checkEscalation(guild, target, moderator);

    await this.sendToModLog(guild, modLogEmbed('Warning', target, moderator, options.reason, null, modCase.caseNumber));

    return { case: modCase, warning };
  }

  async timeout(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    duration: number,
    options: PunishmentOptions = {}
  ) {
    await target.timeout(duration, options.reason);

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.TIMEOUT,
      target.id,
      target.user.tag,
      moderator.id,
      moderator.tag,
      { ...options, duration }
    );

    if (!options.silent) {
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`${EMOJIS.TIMEOUT} You have been timed out in ${guild.name}`)
              .addFields(
                { name: 'Duration', value: formatDuration(duration) },
                { name: 'Reason', value: options.reason ?? 'No reason provided' },
                { name: 'Expires', value: time(new Date(Date.now() + duration), TimestampStyles.RelativeTime) }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DMs disabled */ }
    }

    await this.sendToModLog(guild, modLogEmbed('Timeout', target.user, moderator, options.reason, duration, modCase.caseNumber));
    return modCase;
  }

  async kick(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    options: PunishmentOptions = {}
  ) {
    if (!options.silent) {
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle(`${EMOJIS.KICK} You have been kicked from ${guild.name}`)
              .addFields({ name: 'Reason', value: options.reason ?? 'No reason provided' })
              .setTimestamp(),
          ],
        });
      } catch { /* DMs disabled */ }
    }

    await target.kick(options.reason);

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.KICK,
      target.id,
      target.user.tag,
      moderator.id,
      moderator.tag,
      options
    );

    await this.sendToModLog(guild, modLogEmbed('Kick', target.user, moderator, options.reason, null, modCase.caseNumber));
    return modCase;
  }

  async ban(
    guild: Guild,
    target: User | GuildMember,
    moderator: User,
    options: PunishmentOptions & { deleteMessageDays?: number } = {}
  ) {
    const user = target instanceof GuildMember ? target.user : target;

    if (!options.silent) {
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle(`${EMOJIS.BAN} You have been banned from ${guild.name}`)
              .addFields(
                { name: 'Reason', value: options.reason ?? 'No reason provided' },
                { name: 'Duration', value: options.duration ? formatDuration(options.duration) : 'Permanent' }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DMs disabled */ }
    }

    await guild.members.ban(user, {
      reason: options.reason,
      deleteMessageSeconds: (options.deleteMessageDays ?? 0) * 86400,
    });

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.BAN,
      user.id,
      user.tag,
      moderator.id,
      moderator.tag,
      options
    );

    await this.sendToModLog(guild, modLogEmbed('Ban', user, moderator, options.reason, options.duration, modCase.caseNumber));
    return modCase;
  }

  async softban(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    options: PunishmentOptions = {}
  ) {
    if (!options.silent) {
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setTitle(`${EMOJIS.BAN} You have been softbanned from ${guild.name}`)
              .addFields({ name: 'Reason', value: options.reason ?? 'No reason provided' })
              .setTimestamp(),
          ],
        });
      } catch { /* ignore */ }
    }

    await guild.members.ban(target, { reason: `Softban: ${options.reason}`, deleteMessageSeconds: 7 * 86400 });
    await guild.members.unban(target.id, 'Softban cleanup');

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.SOFTBAN,
      target.id,
      target.user.tag,
      moderator.id,
      moderator.tag,
      options
    );

    await this.sendToModLog(guild, modLogEmbed('Softban', target.user, moderator, options.reason, null, modCase.caseNumber));
    return modCase;
  }

  async unban(
    guild: Guild,
    userId: string,
    moderator: User,
    options: PunishmentOptions = {}
  ) {
    const banInfo = await guild.bans.fetch(userId).catch(() => null);
    if (!banInfo) throw new Error('User is not banned.');

    await guild.members.unban(userId, options.reason);

    await prisma.case.updateMany({
      where: { guildId: guild.id, userId, type: PunishmentType.BAN, active: true },
      data: { active: false, resolvedAt: new Date(), resolvedBy: moderator.id },
    });

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.UNBAN,
      userId,
      banInfo.user.tag,
      moderator.id,
      moderator.tag,
      options
    );

    await this.sendToModLog(guild, modLogEmbed('Unban', banInfo.user, moderator, options.reason, null, modCase.caseNumber));
    return modCase;
  }

  async muteRole(
    guild: Guild,
    target: GuildMember,
    moderator: User,
    options: PunishmentOptions = {}
  ) {
    const config = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (!config?.mutedRoleId) throw new Error('Muted role not configured. Set it in the dashboard.');

    const mutedRole = guild.roles.cache.get(config.mutedRoleId);
    if (!mutedRole) throw new Error('Muted role not found. Please reconfigure it.');

    await target.roles.add(mutedRole, options.reason);

    const modCase = await this.createCase(
      guild.id,
      PunishmentType.MUTE,
      target.id,
      target.user.tag,
      moderator.id,
      moderator.tag,
      options
    );

    if (!options.silent) {
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`${EMOJIS.MUTE} You have been muted in ${guild.name}`)
              .addFields(
                { name: 'Duration', value: options.duration ? formatDuration(options.duration) : 'Indefinite' },
                { name: 'Reason', value: options.reason ?? 'No reason provided' }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* ignore */ }
    }

    await this.sendToModLog(guild, modLogEmbed('Mute', target.user, moderator, options.reason, options.duration, modCase.caseNumber));
    return modCase;
  }

  async checkEscalation(guild: Guild, target: User, moderator: User) {
    const config = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (!config?.escalationEnabled) return;

    const warnCount = await prisma.warning.count({
      where: { guildId: guild.id, userId: target.id, active: true },
    });

    if (warnCount >= config.escalationWarnLimit) {
      const member = await guild.members.fetch(target.id).catch(() => null);
      if (!member) return;

      const action = config.escalationAction;
      if (action === PunishmentType.MUTE) {
        await this.muteRole(guild, member, moderator, {
          reason: `Auto-escalation: ${warnCount} warnings`,
          silent: false,
        }).catch(logger.error.bind(logger));
      } else if (action === PunishmentType.KICK) {
        await this.kick(guild, member, moderator, {
          reason: `Auto-escalation: ${warnCount} warnings`,
        }).catch(logger.error.bind(logger));
      } else if (action === PunishmentType.BAN) {
        await this.ban(guild, target, moderator, {
          reason: `Auto-escalation: ${warnCount} warnings`,
        }).catch(logger.error.bind(logger));
      }
    }
  }

  async sendToModLog(guild: Guild, embed: EmbedBuilder) {
    try {
      const config = await prisma.guild.findUnique({ where: { id: guild.id } });
      if (!config?.modLogChannelId) return;
      const channel = guild.channels.cache.get(config.modLogChannelId) as TextChannel | undefined;
      if (!channel) return;
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Failed to send mod log:', err);
    }
  }

  async getCases(guildId: string, userId?: string, page = 1, limit = 10) {
    const where = { guildId, ...(userId ? { userId } : {}) };
    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { caseNumber: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.case.count({ where }),
    ]);
    return { cases, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getCase(guildId: string, caseNumber: number) {
    return prisma.case.findUnique({ where: { guildId_caseNumber: { guildId, caseNumber } } });
  }

  async deleteCase(guildId: string, caseNumber: number, deletedBy: string) {
    return prisma.case.update({
      where: { guildId_caseNumber: { guildId, caseNumber } },
      data: { active: false, resolvedAt: new Date(), resolvedBy: deletedBy },
    });
  }

  async submitAppeal(guildId: string, caseNumber: number, userId: string, reason: string) {
    const modCase = await this.getCase(guildId, caseNumber);
    if (!modCase) throw new Error('Case not found.');
    if (modCase.userId !== userId) throw new Error('You can only appeal your own cases.');
    if (modCase.appealStatus !== 'NONE') throw new Error('An appeal already exists for this case.');

    return prisma.case.update({
      where: { guildId_caseNumber: { guildId, caseNumber } },
      data: { appealStatus: 'PENDING', appealReason: reason, appealedAt: new Date() },
    });
  }
}
