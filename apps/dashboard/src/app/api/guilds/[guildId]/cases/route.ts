import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@pebble-guard/database';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { guildId } = params;
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
  const userId = url.searchParams.get('userId') ?? undefined;
  const type = url.searchParams.get('type') ?? undefined;

  const where = {
    guildId,
    ...(userId ? { userId } : {}),
    ...(type ? { type: type as any } : {}),
  };

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { caseNumber: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.case.count({ where }),
  ]);

  return NextResponse.json({ cases, total, page, totalPages: Math.ceil(total / limit) });
}
