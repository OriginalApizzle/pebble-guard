import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { prisma } from '@pebble-guard/database';
import { COLORS } from '@pebble-guard/shared';

export class TicketCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'ticket' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('ticket')
        .setDescription('Ticket management commands')
        .addSubcommand(sub =>
          sub.setName('panel').setDescription('Create a ticket panel in a channel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('close').setDescription('Close the current ticket')
            .addStringOption(o => o.setName('reason').setDescription('Reason for closing'))
        )
        .addSubcommand(sub =>
          sub.setName('claim').setDescription('Claim the current ticket')
        )
        .addSubcommand(sub =>
          sub.setName('add').setDescription('Add a user to the current ticket')
            .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove').setDescription('Remove a user from the current ticket')
            .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('rename').setDescription('Rename the ticket channel')
            .addStringOption(o => o.setName('name').setDescription('New name').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('priority').setDescription('Set ticket priority')
            .addStringOption(o => o.setName('priority').setDescription('Priority level').setRequired(true)
              .addChoices(
                { name: 'Low', value: 'LOW' },
                { name: 'Normal', value: 'NORMAL' },
                { name: 'High', value: 'HIGH' },
                { name: 'Urgent', value: 'URGENT' }
              ))
        )
        .addSubcommand(sub =>
          sub.setName('category').setDescription('Manage ticket categories')
            .addStringOption(o => o.setName('action').setDescription('create/list/delete').setRequired(true)
              .addChoices({ name: 'create', value: 'create' }, { name: 'list', value: 'list' }))
            .addStringOption(o => o.setName('name').setDescription('Category name'))
            .addStringOption(o => o.setName('label').setDescription('Button label'))
            .addStringOption(o => o.setName('description').setDescription('Category description'))
            .addStringOption(o => o.setName('emoji').setDescription('Emoji'))
            .addRoleOption(o => o.setName('department').setDescription('Department role for this category'))
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case 'panel': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          return interaction.editReply({ embeds: [errorEmbed('You need Manage Channels permission')] });
        }
        const channel = interaction.options.getChannel('channel', true);
        try {
          await (this.container.client as any).tickets.createTicketPanel(interaction.guild!, channel.id);
          return interaction.editReply({ embeds: [successEmbed('Ticket panel created', `Panel sent in <#${channel.id}>`)] });
        } catch (err: any) {
          return interaction.editReply({ embeds: [errorEmbed('Failed to create panel', err.message)] });
        }
      }

      case 'close': {
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('This is not a ticket channel')] });

        const reason = interaction.options.getString('reason') ?? undefined;
        try {
          await (this.container.client as any).tickets.closeTicket(ticket.id, interaction.member, reason);
          return interaction.editReply({ embeds: [successEmbed('Ticket closing...', 'Channel will be deleted in 5 seconds.')] });
        } catch (err: any) {
          return interaction.editReply({ embeds: [errorEmbed('Failed to close ticket', err.message)] });
        }
      }

      case 'claim': {
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId, status: { not: 'CLOSED' } },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('This is not a ticket channel')] });

        try {
          await (this.container.client as any).tickets.claimTicket(ticket.id, interaction.member);
          return interaction.editReply({ embeds: [successEmbed('Ticket claimed!')] });
        } catch (err: any) {
          return interaction.editReply({ embeds: [errorEmbed('Failed to claim ticket', err.message)] });
        }
      }

      case 'add': {
        const user = interaction.options.getUser('user', true);
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('Not a ticket channel')] });

        const channel = interaction.channel;
        if (channel?.isTextBased() && 'permissionOverwrites' in channel) {
          await channel.permissionOverwrites.create(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
        }
        return interaction.editReply({ embeds: [successEmbed(`Added ${user.tag} to the ticket`)] });
      }

      case 'remove': {
        const user = interaction.options.getUser('user', true);
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('Not a ticket channel')] });
        if (ticket.creatorId === user.id) return interaction.editReply({ embeds: [errorEmbed('Cannot remove the ticket creator')] });

        const channel = interaction.channel;
        if (channel?.isTextBased() && 'permissionOverwrites' in channel) {
          await channel.permissionOverwrites.delete(user.id);
        }
        return interaction.editReply({ embeds: [successEmbed(`Removed ${user.tag} from the ticket`)] });
      }

      case 'rename': {
        const name = interaction.options.getString('name', true);
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('Not a ticket channel')] });

        const channel = interaction.channel;
        if (channel && 'setName' in channel) {
          await (channel as any).setName(name.toLowerCase().replace(/\s+/g, '-'));
        }
        return interaction.editReply({ embeds: [successEmbed('Ticket renamed')] });
      }

      case 'priority': {
        const priority = interaction.options.getString('priority', true) as any;
        const ticket = await prisma.ticket.findFirst({
          where: { guildId: interaction.guild!.id, channelId: interaction.channelId },
        });
        if (!ticket) return interaction.editReply({ embeds: [errorEmbed('Not a ticket channel')] });

        await prisma.ticket.update({ where: { id: ticket.id }, data: { priority } });
        return interaction.editReply({ embeds: [successEmbed(`Priority set to ${priority}`)] });
      }

      case 'category': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.editReply({ embeds: [errorEmbed('You need Manage Server permission')] });
        }
        const action = interaction.options.getString('action', true);

        if (action === 'list') {
          const cats = await prisma.ticketCategory.findMany({ where: { guildId: interaction.guild!.id } });
          if (!cats.length) return interaction.editReply({ content: 'No ticket categories configured.' });
          const embed = new EmbedBuilder()
            .setColor(COLORS.TICKET)
            .setTitle('Ticket Categories')
            .setDescription(cats.map(c => `**${c.emoji ?? '📁'} ${c.name}** — ${c.description ?? 'No description'} | Active: ${c.isActive ? '✅' : '❌'}`).join('\n'));
          return interaction.editReply({ embeds: [embed] });
        }

        if (action === 'create') {
          const name = interaction.options.getString('name');
          const label = interaction.options.getString('label') ?? name;
          if (!name || !label) return interaction.editReply({ embeds: [errorEmbed('Name and label are required')] });

          await prisma.ticketCategory.create({
            data: {
              guildId: interaction.guild!.id,
              name,
              label,
              description: interaction.options.getString('description') ?? undefined,
              emoji: interaction.options.getString('emoji') ?? undefined,
              departmentRoleId: interaction.options.getRole('department')?.id ?? undefined,
            },
          });
          return interaction.editReply({ embeds: [successEmbed(`Category "${name}" created`)] });
        }

        return interaction.editReply({ embeds: [errorEmbed('Unknown action')] });
      }

      default:
        return interaction.editReply({ embeds: [errorEmbed('Unknown subcommand')] });
    }
  }
}
