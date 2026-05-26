import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@pebble-guard/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = await prisma.apiKey.findMany({
    where: { guildId: params.guildId, isActive: true },
    select: { id: true, name: true, keyPrefix: true, permissions: true, createdAt: true, lastUsedAt: true, usageCount: true },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, permissions } = await req.json();
  const rawKey = `pg_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = await bcrypt.hash(rawKey, 10);

  const key = await prisma.apiKey.create({
    data: {
      guildId: params.guildId,
      name,
      keyHash,
      keyPrefix: rawKey.slice(0, 8),
      permissions: permissions ?? [],
      userId: (session.user as any).discordId ?? 'unknown',
    },
  });

  return NextResponse.json({ ...key, rawKey }); // Only returned once
}

export async function DELETE(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { keyId } = await req.json();
  await prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
