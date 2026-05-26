import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@pebble-guard/database';

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const guild = await prisma.guild.findUnique({ where: { id: params.guildId } });
  if (!guild) return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
  return NextResponse.json(guild);
}

export async function PATCH(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // Allowlist safe fields to update
  const safe = [
    'modEnabled', 'loggingEnabled', 'verificationEnabled', 'ticketsEnabled',
    'automodEnabled', 'welcomeEnabled', 'analyticsEnabled',
    'modLogChannelId', 'msgLogChannelId', 'joinLeaveChannelId', 'welcomeChannelId',
    'verificationChannelId', 'ticketCategoryId', 'boostLogChannelId', 'voiceLogChannelId',
    'mutedRoleId', 'verifiedRoleId', 'unverifiedRoleId', 'staffRoleId', 'modRoleId', 'adminRoleId',
    'welcomeMessage', 'leaveMessage', 'welcomeEmbed',
    'verificationMethod', 'verificationMessage', 'minAccountAge', 'captchaEnabled',
    'raidMode', 'raidModeThreshold', 'raidModeInterval', 'antiAltEnabled', 'minAltAge',
    'linkFilterEnabled', 'linkWhitelist', 'spamThreshold', 'spamInterval',
    'massMentionLimit', 'wordBlacklist', 'inviteFilterEnabled', 'capsFilterEnabled', 'capsThreshold',
    'escalationEnabled', 'escalationWarnLimit', 'escalationAction',
  ];

  const update = Object.fromEntries(Object.entries(body).filter(([k]) => safe.includes(k)));
  const guild = await prisma.guild.update({ where: { id: params.guildId }, data: update });
  return NextResponse.json(guild);
}
