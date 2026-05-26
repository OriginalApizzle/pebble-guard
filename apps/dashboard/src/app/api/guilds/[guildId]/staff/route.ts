import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@pebble-guard/database';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const staff = await prisma.staffPermission.findMany({ where: { guildId: params.guildId }, orderBy: { level: 'desc' } });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const record = await prisma.staffPermission.upsert({
    where: { guildId_roleId: { guildId: params.guildId, roleId: body.roleId } },
    create: { guildId: params.guildId, roleId: body.roleId, roleName: body.roleName, level: body.level ?? 1, department: body.department, permissions: body.permissions ?? [] },
    update: { level: body.level, department: body.department, permissions: body.permissions ?? [] },
  });
  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { roleId } = await req.json();
  await prisma.staffPermission.deleteMany({ where: { guildId: params.guildId, roleId } });
  return NextResponse.json({ success: true });
}
