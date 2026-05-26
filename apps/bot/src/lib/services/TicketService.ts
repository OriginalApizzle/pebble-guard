import {
  Guild,
  TextChannel,
  CategoryChannel,
  GuildMember,
  User,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { SapphireClient } from '@sapphire/framework';
import { prisma, TicketStatus, TicketPriority } from '@pebble-guard/database';
import { COLORS, EMOJIS } from '@pebble-guard/shared';
import { logger } from '../utils/logger';

export class TicketService {
  constructor(private client: SapphireClient) {}

  async createTicketPanel(guild: Guild, channelId: string, staffId?: string) {
    const config = await prisma.guild.findUnique({
      where: { id: guild.id },
      include: { ticketCategories: { where: { isActive: true }, orderBy: { position: 'asc' } } },
    });

    if (!config?.ticketsEnabled) throw new Error('Tickets module is disabled.');
    if (!config.ticketCategories.length) throw new Error('No ticket categories configured.');

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) throw new Error('Channel not found.');

    const embed = new EmbedBuilder()
      .setColor(COLORS.TICKET)
      .setTitle(`${EMOJIS.TICKET} Support Center`)
      .setDescription('Select a category below to open a support ticket. Our staff will respond as soon as possible.')
      .addFields(
        config.ticketCategories.map(cat => ({
          name: `${cat.emoji ?? '📁'} ${cat.name}`,
          value: cat.description ?? 'Click to open a ticket',
          inline: true,
        }))
      )
      .setFooter({ text: 'Do not abuse the ticket system. False tickets will result in punishment.' })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket:create')
      .setPlaceholder('Select a category...')
      .addOptions(
        config.ticketCategories.map(cat => ({
          label: cat.label,
          value: cat.id,
          description: cat.description?.slice(0, 100) ?? undefined,
          emoji: cat.emoji ?? undefined,
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
    logger.info(`Ticket panel created in ${guild.name}#${channel.name}`);
  }

  async openTicket(guild: Guild, creator: GuildMember, categoryId: string) {
    const config = await prisma.guild.findUnique({
      where: { id: guild.id },
      include: { ticketCategories: { where: { id: categoryId } } },
    });

    if (!config?.ticketsEnabled) throw new Error('Tickets are disabled.');
    const category = config.ticketCategories[0];
    if (!category) throw new Error('Category not found.');

    // Check if user already has an open ticket in this category
    const existing = await prisma.ticket.findFirst({
      where: { guildId: guild.id, creatorId: creator.id, status: { in: ['OPEN', 'CLAIMED', 'PENDING'] } },
    });
    if (existing) throw new Error(`You already have an open ticket. Please close it first: <#${existing.channelId}>`);

    // Get next ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { guildId: guild.id },
      orderBy: { ticketNumber: 'desc' },
    });
    const ticketNumber = (lastTicket?.ticketNumber ?? 0) + 1;

    // Find or create ticket category channel
    let parentCategory: CategoryChannel | undefined;
    if (config.ticketCategoryId) {
      parentCategory = guild.channels.cache.get(config.ticketCategoryId) as CategoryChannel | undefined;
    }

    // Create the ticket channel
    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketNumber.toString().padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: parentCategory,
      topic: `Ticket #${ticketNumber} | ${creator.user.tag} | ${category.name}`,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: creator.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
        },
        ...(category.departmentRoleId ? [{
          id: category.departmentRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
        }] : []),
        ...(config.staffRoleId ? [{
          id: config.staffRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
        }] : []),
      ],
    });

    // Create DB record
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        guildId: guild.id,
        categoryId: category.id,
        channelId: ticketChannel.id,
        creatorId: creator.id,
        creatorTag: creator.user.tag,
        priority: category.priority,
        autoCloseAt: category.autoClose
          ? new Date(Date.now() + category.autoClose * 60 * 1000)
          : null,
      },
    });

    // Send opening embed
    const embed = new EmbedBuilder()
      .setColor(COLORS.TICKET)
      .setTitle(`${EMOJIS.TICKET} Ticket #${ticketNumber} — ${category.name}`)
      .setDescription(`Welcome ${creator}, our staff will assist you shortly.\n\nPlease describe your issue in detail.`)
      .addFields(
        { name: 'Category', value: `${category.emoji ?? '📁'} ${category.name}`, inline: true },
        { name: 'Priority', value: category.priority, inline: true },
        { name: 'Creator', value: `${creator} (${creator.user.tag})`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticket.id}` })
      .setTimestamp();

    const closeButton = new ButtonBuilder()
      .setCustomId(`ticket:close:${ticket.id}`)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const claimButton = new ButtonBuilder()
      .setCustomId(`ticket:claim:${ticket.id}`)
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✋');

    const noteButton = new ButtonBuilder()
      .setCustomId(`ticket:note:${ticket.id}`)
      .setLabel('Add Note')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📝');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton, claimButton, noteButton);

    await ticketChannel.send({
      content: `${creator} | <@&${category.departmentRoleId ?? config.staffRoleId ?? guild.id}>`,
      embeds: [embed],
      components: [row],
    });

    // Log ticket
    await prisma.logEntry.create({
      data: {
        guildId: guild.id,
        type: 'TICKET_OPEN',
        userId: creator.id,
        userTag: creator.user.tag,
        description: `Ticket #${ticketNumber} opened in category ${category.name}`,
        channelId: ticketChannel.id,
      },
    });

    // Update daily stats
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await prisma.dailyStats.upsert({
      where: { guildId_date: { guildId: guild.id, date: today } },
      create: { guildId: guild.id, date: today, ticketsOpened: 1 },
      update: { ticketsOpened: { increment: 1 } },
    }).catch(() => null);

    return { ticket, channel: ticketChannel };
  }

  async closeTicket(
    ticketId: string,
    closedBy: GuildMember,
    reason?: string
  ) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found.');
    if (ticket.status === TicketStatus.CLOSED) throw new Error('Ticket is already closed.');

    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) throw new Error('Guild not found.');

    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;

    // Generate transcript
    const transcript = await this.generateTranscript(ticket.id, guild);

    // Update DB
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedBy: closedBy.id,
        closedAt: new Date(),
      },
    });

    // Notify in channel before deletion
    if (channel) {
      const closeEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`${EMOJIS.LOCK} Ticket Closed`)
        .addFields(
          { name: 'Closed By', value: `${closedBy.user.tag}`, inline: true },
          { name: 'Reason', value: reason ?? 'No reason provided', inline: true }
        )
        .setTimestamp();

      await channel.send({ embeds: [closeEmbed] }).catch(() => null);

      // Archive after 5 seconds
      setTimeout(async () => {
        await channel.delete(`Ticket #${ticket.ticketNumber} closed`).catch(() => null);
      }, 5000);
    }

    // Send transcript to ticket creator
    try {
      const creator = await this.client.users.fetch(ticket.creatorId);
      if (transcript) {
        await creator.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.INFO)
              .setTitle(`${EMOJIS.TICKET} Ticket #${ticket.ticketNumber} Closed`)
              .setDescription(`Your ticket has been closed. Transcript below.`)
              .addFields({ name: 'Reason', value: reason ?? 'No reason provided' })
              .setTimestamp(),
          ],
        }).catch(() => null);
      }
    } catch { /* ignore */ }

    // Log
    await prisma.logEntry.create({
      data: {
        guildId: ticket.guildId,
        type: 'TICKET_CLOSE',
        userId: closedBy.id,
        userTag: closedBy.user.tag,
        description: `Ticket #${ticket.ticketNumber} closed`,
        channelId: ticket.channelId,
        metadata: { reason },
      },
    }).catch(() => null);

    // Daily stats
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await prisma.dailyStats.upsert({
      where: { guildId_date: { guildId: ticket.guildId, date: today } },
      create: { guildId: ticket.guildId, date: today, ticketsClosed: 1 },
      update: { ticketsClosed: { increment: 1 } },
    }).catch(() => null);

    return ticket;
  }

  async claimTicket(ticketId: string, staffMember: GuildMember) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found.');
    if (ticket.status === TicketStatus.CLOSED) throw new Error('Ticket is closed.');
    if (ticket.claimedBy) throw new Error(`Ticket already claimed by <@${ticket.claimedBy}>.`);

    const guild = this.client.guilds.cache.get(ticket.guildId);
    const channel = guild?.channels.cache.get(ticket.channelId) as TextChannel | undefined;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        claimedBy: staffMember.id,
        claimedByTag: staffMember.user.tag,
        status: TicketStatus.CLAIMED,
      },
    });

    if (channel) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('✋ Ticket Claimed')
            .setDescription(`${staffMember} is now handling this ticket.`)
            .setTimestamp(),
        ],
      }).catch(() => null);
    }

    return updated;
  }

  async generateTranscript(ticketId: string, guild: Guild): Promise<string | null> {
    try {
      const messages = await prisma.ticketMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

      if (!messages.length) return null;

      const lines = messages.map(m =>
        `[${m.createdAt.toISOString()}] ${m.userTag}: ${m.content}`
      );

      return lines.join('\n');
    } catch {
      return null;
    }
  }

  async getTickets(guildId: string, options: {
    status?: TicketStatus;
    creatorId?: string;
    claimedBy?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, creatorId, claimedBy, page = 1, limit = 20 } = options;
    const where = {
      guildId,
      ...(status ? { status } : {}),
      ...(creatorId ? { creatorId } : {}),
      ...(claimedBy ? { claimedBy } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total, page, totalPages: Math.ceil(total / limit) };
  }

  async addNote(ticketId: string, content: string, staffId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found.');

    return prisma.ticket.update({
      where: { id: ticketId },
      data: { internalNotes: content },
    });
  }

  async escalateTicket(ticketId: string, escalatedBy: GuildMember, reason: string, toRoleId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found.');

    await prisma.ticketEscalation.create({
      data: {
        ticketId,
        escalatedBy: escalatedBy.id,
        reason,
        toRole: toRoleId,
      },
    });

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: TicketPriority.URGENT },
    });

    const guild = this.client.guilds.cache.get(ticket.guildId);
    const channel = guild?.channels.cache.get(ticket.channelId) as TextChannel | undefined;

    if (channel) {
      await channel.send({
        content: `<@&${toRoleId}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('⬆️ Ticket Escalated')
            .addFields(
              { name: 'Escalated By', value: `${escalatedBy.user.tag}`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setTimestamp(),
        ],
      }).catch(() => null);
    }
  }
}
