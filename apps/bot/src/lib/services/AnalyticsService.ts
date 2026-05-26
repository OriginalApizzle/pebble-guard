import { SapphireClient } from '@sapphire/framework';
import { prisma } from '@pebble-guard/database';

export class AnalyticsService {
  constructor(private client: SapphireClient) {}

  async getServerStats(guildId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    const [dailyStats, caseStats, ticketStats, totalCases, totalTickets] = await Promise.all([
      prisma.dailyStats.findMany({
        where: { guildId, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      prisma.case.groupBy({
        by: ['type'],
        where: { guildId, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: { guildId },
        _count: true,
      }),
      prisma.case.count({ where: { guildId } }),
      prisma.ticket.count({ where: { guildId } }),
    ]);

    const staffPerformance = await prisma.staffActivity.groupBy({
      by: ['userId', 'userTag'],
      where: { guildId, createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    });

    return {
      dailyStats,
      caseStats,
      ticketStats,
      totalCases,
      totalTickets,
      staffPerformance,
    };
  }

  async getGrowthData(guildId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    return prisma.dailyStats.findMany({
      where: { guildId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  async trackEvent(guildId: string, type: string, userId?: string, data?: Record<string, unknown>) {
    await prisma.analyticsEvent.create({
      data: { guildId, type, userId, data: data ?? {} },
    }).catch(() => null);
  }
}
