import { Listener, Events } from '@sapphire/framework';
import { Interaction, EmbedBuilder } from 'discord.js';
import { COLORS } from '@pebble-guard/shared';
import { prisma } from '@pebble-guard/database';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';
import { logger } from '../../lib/utils/logger';

export class InteractionCreateListener extends Listener<typeof Events.InteractionCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public async run(interaction: Interaction) {
    const client = this.container.client as any;

    // ===== BUTTONS =====
    if (interaction.isButton()) {
      const [prefix, action, id] = interaction.customId.split(':');

      if (prefix === 'verify' && action === 'start') {
        await interaction.deferReply({ ephemeral: true });
        const result = await client.verification.startVerification(interaction.member);
        await interaction.editReply({
          embeds: [result.success ? successEmbed('Verified! ✅', result.message) : errorEmbed('Verification', result.message)],
        });
        return;
      }

      if (prefix === 'ticket') {
        await interaction.deferReply({ ephemeral: true });

        if (action === 'close') {
          const ticket = await prisma.ticket.findUnique({ where: { id } });
          if (!ticket) return interaction.editReply({ embeds: [errorEmbed('Ticket not found')] });
          try {
            await client.tickets.closeTicket(ticket.id, interaction.member, 'Closed via button');
            await interaction.editReply({ embeds: [successEmbed('Ticket closing...')] });
          } catch (err: any) {
            await interaction.editReply({ embeds: [errorEmbed('Failed', err.message)] });
          }
          return;
        }

        if (action === 'claim') {
          try {
            await client.tickets.claimTicket(id, interaction.member);
            await interaction.editReply({ embeds: [successEmbed('Ticket claimed!')] });
          } catch (err: any) {
            await interaction.editReply({ embeds: [errorEmbed('Failed', err.message)] });
          }
          return;
        }

        if (action === 'note') {
          // Would show a modal in production
          await interaction.editReply({ content: 'Use `/ticket note` to add an internal note.' });
          return;
        }
      }
    }

    // ===== SELECT MENUS =====
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket:create') {
        await interaction.deferReply({ ephemeral: true });
        const categoryId = interaction.values[0];

        try {
          const { ticket, channel } = await client.tickets.openTicket(
            interaction.guild!, interaction.member, categoryId
          );
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🎫 Ticket Created!')
                .setDescription(`Your ticket has been created: <#${channel.id}>`)
                .setTimestamp(),
            ],
          });
        } catch (err: any) {
          await interaction.editReply({ embeds: [errorEmbed('Failed to create ticket', err.message)] });
        }
        return;
      }
    }
  }
}
