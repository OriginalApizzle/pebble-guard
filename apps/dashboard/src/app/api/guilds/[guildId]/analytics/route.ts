import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@pebble-guard/database';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { guildId } = params;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  try {
    const [totalCases, openTickets, totalTickets, dailyStats, staffPerformance, guild] = await Promise.all([
      prisma.case.count({ where: { guildId } }),
      prisma.ticket.count({ where: { guildId, status: { not: 'CLOSED' } } }),
      prisma.ticket.count({ where: { guildId } }),
      prisma.dailyStats.findMany({ where: { guildId, date: { gte: since } }, orderBy: { date: 'asc' } }),
      prisma.staffActivity.groupBy({
        by: ['userId', 'userTag'],
        where: { guildId, createdAt: { gte: since } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.guild.findUnique({ where: { id: guildId } }),
    ]);

    return NextResponse.json({
      totalCases,
      openTickets,
      totalTickets,
      memberCount: 0, // fetched client-side from Discord API
      dailyStats: dailyStats.map(s => ({
        date: s.date.toISOString().split('T')[0],
        joins: s.joins,
        leaves: s.leaves,
        punishments: s.punishments,
        ticketsOpened: s.ticketsOpened,
      })),
      staffPerformance,
      guild,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
