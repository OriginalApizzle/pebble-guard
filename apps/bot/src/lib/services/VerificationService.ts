import {
  Guild,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { SapphireClient } from '@sapphire/framework';
import { prisma, VerificationMethod, VerificationStatus } from '@pebble-guard/database';
import { COLORS, EMOJIS, generateCaptcha } from '@pebble-guard/shared';
import { logger } from '../utils/logger';

export class VerificationService {
  constructor(private client: SapphireClient) {}

  async createVerificationPanel(guild: Guild, channelId: string) {
    const config = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (!config?.verificationEnabled) throw new Error('Verification module is disabled.');

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) throw new Error('Channel not found.');

    const embed = new EmbedBuilder()
      .setColor(COLORS.VERIFICATION)
      .setTitle(`${EMOJIS.SHIELD} Server Verification`)
      .setDescription(
        config.verificationMessage ??
        'Welcome! To gain access to the server, please complete the verification below.\n\nThis helps us keep the server safe from bots and alt accounts.'
      )
      .addFields(
        { name: 'Requirements', value: config.minAccountAge > 0 ? `• Account must be at least **${config.minAccountAge} days** old` : '• No minimum account age', inline: false },
        ...(config.antiAltEnabled ? [{ name: '⚠️ Anti-Alt', value: `Accounts younger than ${config.minAltAge} days may be flagged for review.`, inline: false }] : [])
      )
      .setFooter({ text: 'Click the button below to verify.' })
      .setTimestamp();

    const verifyButton = new ButtonBuilder()
      .setCustomId('verify:start')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

    await channel.send({ embeds: [embed], components: [row] });
  }

  async startVerification(member: GuildMember): Promise<{ success: boolean; message: string }> {
    const config = await prisma.guild.findUnique({ where: { id: member.guild.id } });
    if (!config?.verificationEnabled) return { success: false, message: 'Verification is not enabled.' };

    // Check if already verified
    if (config.verifiedRoleId && member.roles.cache.has(config.verifiedRoleId)) {
      return { success: false, message: 'You are already verified!' };
    }

    // Check account age
    if (config.minAccountAge > 0) {
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < config.minAccountAge) {
        return {
          success: false,
          message: `Your account must be at least **${config.minAccountAge} days** old to verify. Your account is ${Math.floor(accountAgeDays)} days old.`,
        };
      }
    }

    // Check anti-alt
    if (config.antiAltEnabled) {
      const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < config.minAltAge) {
        // Flag for review instead of auto-deny
        await this.flagSuspiciousAccount(member, `Account age: ${Math.floor(accountAgeDays)} days (minimum: ${config.minAltAge})`);
      }
    }

    // Create verification record
    const verification = await prisma.verification.create({
      data: {
        guildId: member.guild.id,
        userId: member.id,
        method: config.verificationMethod,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ...(config.captchaEnabled ? { captchaCode: generateCaptcha() } : {}),
      },
    });

    if (config.verificationMethod === VerificationMethod.BUTTON) {
      // Simple button click — verify immediately
      return this.completeVerification(member, verification.id);
    } else if (config.verificationMethod === VerificationMethod.CAPTCHA) {
      return {
        success: false,
        message: `Please solve the CAPTCHA to verify. Code: **${verification.captchaCode}**\nReply with: \`/verify code:${verification.captchaCode}\``,
      };
    }

    return { success: true, message: 'Verification started.' };
  }

  async completeVerification(member: GuildMember, verificationId: string): Promise<{ success: boolean; message: string }> {
    const config = await prisma.guild.findUnique({ where: { id: member.guild.id } });
    if (!config) return { success: false, message: 'Guild not found.' };

    // Assign verified role
    if (config.verifiedRoleId) {
      const role = member.guild.roles.cache.get(config.verifiedRoleId);
      if (role) await member.roles.add(role, 'Verification completed').catch(() => null);
    }

    // Remove unverified role
    if (config.unverifiedRoleId) {
      const role = member.guild.roles.cache.get(config.unverifiedRoleId);
      if (role) await member.roles.remove(role, 'Verification completed').catch(() => null);
    }

    // Assign auto-roles for verified
    const autoRoles = await prisma.autoRole.findMany({ where: { guildId: member.guild.id, onVerify: true } });
    for (const ar of autoRoles) {
      const role = member.guild.roles.cache.get(ar.roleId);
      if (role) await member.roles.add(role).catch(() => null);
    }

    // Update verification
    await prisma.verification.update({
      where: { id: verificationId },
      data: { status: VerificationStatus.VERIFIED, verifiedAt: new Date() },
    }).catch(() => null);

    // Log
    await prisma.logEntry.create({
      data: {
        guildId: member.guild.id,
        type: 'VERIFICATION',
        userId: member.id,
        userTag: member.user.tag,
        description: `${member.user.tag} verified`,
      },
    }).catch(() => null);

    // Daily stats
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await prisma.dailyStats.upsert({
      where: { guildId_date: { guildId: member.guild.id, date: today } },
      create: { guildId: member.guild.id, date: today, verifications: 1 },
      update: { verifications: { increment: 1 } },
    }).catch(() => null);

    return { success: true, message: `You have been successfully verified in **${member.guild.name}**!` };
  }

  async verifyCaptcha(member: GuildMember, code: string): Promise<{ success: boolean; message: string }> {
    const verification = await prisma.verification.findFirst({
      where: {
        guildId: member.guild.id,
        userId: member.id,
        status: VerificationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) return { success: false, message: 'No pending verification found. Please try again.' };

    if (verification.expiresAt && verification.expiresAt < new Date()) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: { status: VerificationStatus.EXPIRED },
      });
      return { success: false, message: 'Verification expired. Please click the verify button again.' };
    }

    if (verification.attempts >= 5) {
      return { success: false, message: 'Too many failed attempts. Please try again later.' };
    }

    if (code.toUpperCase() !== verification.captchaCode) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, message: `Incorrect code. ${5 - verification.attempts - 1} attempts remaining.` };
    }

    return this.completeVerification(member, verification.id);
  }

  async flagSuspiciousAccount(member: GuildMember, reason: string) {
    const config = await prisma.guild.findUnique({ where: { id: member.guild.id } });
    if (!config?.verificationChannelId) return;

    const channel = member.guild.channels.cache.get(config.verificationChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle(`${EMOJIS.WARNING} Suspicious Account Detected`)
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  }

  async handleRaidDetection(guild: Guild, newMemberId: string) {
    const config = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (!config?.raidMode && config?.raidModeThreshold) {
      // Count recent joins within threshold window
      const windowStart = new Date(Date.now() - config.raidModeInterval * 1000);
      const recentJoins = await prisma.logEntry.count({
        where: {
          guildId: guild.id,
          type: 'MEMBER_JOIN',
          createdAt: { gte: windowStart },
        },
      });

      if (recentJoins >= config.raidModeThreshold) {
        // Enable raid mode
        await prisma.guild.update({ where: { id: guild.id }, data: { raidMode: true } });
        logger.warn(`Raid mode enabled in guild ${guild.name} (${guild.id})`);

        // Alert staff
        if (config.modLogChannelId) {
          const channel = guild.channels.cache.get(config.modLogChannelId) as TextChannel | undefined;
          await channel?.send({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('🚨 RAID DETECTED — Raid Mode Enabled')
                .setDescription(`${recentJoins} members joined in ${config.raidModeInterval} seconds. Raid mode is now active.`)
                .addFields({ name: 'Action', value: 'New joins will be restricted until raid mode is disabled via `/raidmode off`' })
                .setTimestamp(),
            ],
          }).catch(() => null);
        }
      }
    }
  }
}
