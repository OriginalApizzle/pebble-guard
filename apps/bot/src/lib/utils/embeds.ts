import { EmbedBuilder, User } from 'discord.js';
import { COLORS, EMOJIS } from '@pebble-guard/shared';

export function successEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`${EMOJIS.SUCCESS} ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function errorEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`${EMOJIS.ERROR} ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function warningEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`${EMOJIS.WARNING} ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function infoEmbed(title: string, description?: string) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`${EMOJIS.INFO} ${title}`)
    .setDescription(description ?? null)
    .setTimestamp();
}

export function modLogEmbed(
  action: string,
  target: User,
  moderator: User,
  reason?: string | null,
  duration?: number | null,
  caseNumber?: number
) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.MODERATION)
    .setTitle(`${EMOJIS.SHIELD} Moderation Action — ${action}`)
    .addFields(
      { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
      { name: 'Reason', value: reason ?? 'No reason provided', inline: false }
    )
    .setThumbnail(target.displayAvatarURL())
    .setTimestamp();

  if (caseNumber) embed.setFooter({ text: `Case #${caseNumber}` });
  if (duration) {
    const ms = duration;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    embed.addFields({ name: 'Duration', value: `${d}d ${h}h ${m}m`, inline: true });
  }

  return embed;
}
