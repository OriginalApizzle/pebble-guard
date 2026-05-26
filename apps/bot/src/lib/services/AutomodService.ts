import { Message, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { SapphireClient } from '@sapphire/framework';
import { prisma } from '@pebble-guard/database';
import { COLORS, EMOJIS } from '@pebble-guard/shared';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

export class AutomodService {
  private spamCache: Map<string, { count: number; firstMessage: number }> = new Map();

  constructor(private client: SapphireClient) {}

  async analyzeMessage(message: Message): Promise<{ triggered: boolean; reason?: string }> {
    if (!message.guild || message.author.bot || message.author.system) {
      return { triggered: false };
    }

    const config = await prisma.guild.findUnique({ where: { id: message.guild.id } });
    if (!config?.automodEnabled) return { triggered: false };

    // Check member permissions — skip mod+
    const member = message.member;
    if (member?.permissions.has('ManageMessages')) return { triggered: false };

    // Word blacklist
    if (config.wordBlacklist.length > 0) {
      const content = message.content.toLowerCase();
      const blocked = config.wordBlacklist.find(word => content.includes(word.toLowerCase()));
      if (blocked) {
        await this.handleAutomodAction(message, `Blacklisted word: "${blocked}"`);
        return { triggered: true, reason: `Blacklisted word` };
      }
    }

    // Link filter
    if (config.linkFilterEnabled) {
      const urlRegex = /https?:\/\/[^\s]+/gi;
      const urls = message.content.match(urlRegex);
      if (urls) {
        const allowed = config.linkWhitelist;
        const blocked = urls.find(url => !allowed.some(w => url.includes(w)));
        if (blocked) {
          await this.handleAutomodAction(message, `Unauthorized link: ${blocked}`);
          return { triggered: true, reason: 'Unauthorized link' };
        }
      }
    }

    // Discord invite filter
    if (config.inviteFilterEnabled) {
      const inviteRegex = /discord\.(gg|com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(message.content)) {
        await this.handleAutomodAction(message, 'Discord invite link');
        return { triggered: true, reason: 'Discord invite link' };
      }
    }

    // Caps filter
    if (config.capsFilterEnabled && message.content.length > 10) {
      const upper = (message.content.match(/[A-Z]/g) || []).length;
      const total = (message.content.match(/[a-zA-Z]/g) || []).length;
      if (total > 0 && (upper / total) * 100 >= config.capsThreshold) {
        await this.handleAutomodAction(message, 'Excessive capitalization');
        return { triggered: true, reason: 'Excessive caps' };
      }
    }

    // Mass mention
    if (message.mentions.users.size + message.mentions.roles.size >= config.massMentionLimit) {
      await this.handleAutomodAction(message, `Mass mention: ${message.mentions.users.size + message.mentions.roles.size} pings`);
      return { triggered: true, reason: 'Mass mention' };
    }

    // Spam detection
    const spamKey = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const spamData = this.spamCache.get(spamKey);

    if (!spamData || now - spamData.firstMessage > config.spamInterval * 1000) {
      this.spamCache.set(spamKey, { count: 1, firstMessage: now });
    } else {
      spamData.count++;
      if (spamData.count >= config.spamThreshold) {
        this.spamCache.delete(spamKey);
        await this.handleAutomodAction(message, `Spam: ${spamData.count} messages in ${config.spamInterval}s`);
        return { triggered: true, reason: 'Spam' };
      }
    }

    return { triggered: false };
  }

  private async handleAutomodAction(message: Message, reason: string) {
    try {
      await message.delete().catch(() => null);

      // Warn the user
      const config = await prisma.guild.findUnique({ where: { id: message.guild!.id } });

      // Send DM
      try {
        await message.author.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`${EMOJIS.WARNING} AutoMod Action in ${message.guild!.name}`)
              .addFields(
                { name: 'Reason', value: reason },
                { name: 'Channel', value: `<#${message.channelId}>` }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DMs disabled */ }

      // Log to modlog channel
      if (config?.modLogChannelId) {
        const logChannel = message.guild!.channels.cache.get(config.modLogChannelId) as TextChannel | undefined;
        await logChannel?.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setTitle(`${EMOJIS.WARNING} AutoMod Triggered`)
              .addFields(
                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                { name: 'Reason', value: reason },
                { name: 'Content', value: message.content.slice(0, 512) }
              )
              .setTimestamp(),
          ],
        }).catch(() => null);
      }

      // Store log
      await prisma.logEntry.create({
        data: {
          guildId: message.guild!.id,
          type: 'AUTOMOD_ACTION',
          userId: message.author.id,
          userTag: message.author.tag,
          channelId: message.channelId,
          description: `AutoMod: ${reason}`,
          metadata: { content: message.content.slice(0, 4000), reason },
        },
      }).catch(() => null);

    } catch (err) {
      logger.error('AutoMod action failed:', err);
    }
  }
}
