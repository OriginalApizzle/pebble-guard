import { SapphireClient } from '@sapphire/framework';
import { prisma } from '@pebble-guard/database';
import { logger } from '../utils/logger';

export class SchedulerService {
  private interval: NodeJS.Timeout | null = null;

  constructor(private client: SapphireClient) {}

  async start() {
    logger.info('Scheduler service started');
    this.interval = setInterval(() => this.processQueue(), 30_000);
    await this.processQueue();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async processQueue() {
    const tasks = await prisma.scheduledTask.findMany({
      where: { executed: false, executeAt: { lte: new Date() } },
      take: 50,
    });

    for (const task of tasks) {
      try {
        await this.executeTask(task);
        await prisma.scheduledTask.update({ where: { id: task.id }, data: { executed: true } });
      } catch (err) {
        logger.error(`Failed to execute task ${task.id}:`, err);
      }
    }
  }

  private async executeTask(task: { id: string; guildId: string; type: string; data: unknown }) {
    const guild = this.client.guilds.cache.get(task.guildId);
    if (!guild) return;

    const data = task.data as Record<string, unknown>;

    switch (task.type) {
      case 'UNBAN': {
        const userId = data.userId as string;
        await guild.members.unban(userId, 'Temporary ban expired').catch(() => null);
        logger.info(`Auto-unbanned ${userId} in ${guild.name}`);
        break;
      }
      case 'UNMUTE': {
        const userId = data.userId as string;
        const config = await prisma.guild.findUnique({ where: { id: task.guildId } });
        if (config?.mutedRoleId) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.roles.remove(config.mutedRoleId, 'Mute duration expired').catch(() => null);
            logger.info(`Auto-unmuted ${userId} in ${guild.name}`);
          }
        }
        break;
      }
      case 'TICKET_CLOSE': {
        const ticketId = data.ticketId as string;
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (ticket && ticket.status !== 'CLOSED') {
          const channel = guild.channels.cache.get(ticket.channelId);
          if (channel) {
            await channel.delete('Auto-close: Ticket expired').catch(() => null);
          }
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'CLOSED', closedAt: new Date(), closedBy: this.client.user?.id },
          });
        }
        break;
      }
      case 'ANNOUNCEMENT': {
        const channelId = data.channelId as string;
        const content = data.content as string;
        const channel = guild.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
          await (channel as import('discord.js').TextChannel).send(content).catch(() => null);
        }
        break;
      }
      case 'ROLE_ASSIGN': {
        const userId = data.userId as string;
        const roleId = data.roleId as string;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) await member.roles.add(roleId).catch(() => null);
        break;
      }
      case 'ROLE_REMOVE': {
        const userId = data.userId as string;
        const roleId = data.roleId as string;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) await member.roles.remove(roleId).catch(() => null);
        break;
      }
    }
  }
}
