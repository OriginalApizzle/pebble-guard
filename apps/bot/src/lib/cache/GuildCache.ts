import Redis from 'ioredis';
import { prisma } from '@pebble-guard/database';
import type { Guild as PrismaGuild } from '@pebble-guard/database';
import { TIMEOUTS } from '@pebble-guard/shared';
import { logger } from '../utils/logger';

export class GuildCache {
  private redis: Redis;
  private readonly TTL = TIMEOUTS.CACHE_TTL;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private key(guildId: string) {
    return `guild:${guildId}`;
  }

  async get(guildId: string): Promise<PrismaGuild | null> {
    try {
      const cached = await this.redis.get(this.key(guildId));
      if (cached) return JSON.parse(cached) as PrismaGuild;
    } catch { /* redis unavailable */ }

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (guild) await this.set(guildId, guild);
    return guild;
  }

  async getOrCreate(guildId: string, name: string, ownerId: string): Promise<PrismaGuild> {
    const existing = await this.get(guildId);
    if (existing) return existing;

    const guild = await prisma.guild.create({
      data: { id: guildId, name, ownerId },
    });

    await this.set(guildId, guild);
    return guild;
  }

  async set(guildId: string, data: PrismaGuild): Promise<void> {
    try {
      await this.redis.setex(this.key(guildId), this.TTL, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  async invalidate(guildId: string): Promise<void> {
    try {
      await this.redis.del(this.key(guildId));
    } catch { /* ignore */ }
  }

  async update(guildId: string, updates: Partial<PrismaGuild>): Promise<PrismaGuild> {
    const guild = await prisma.guild.update({
      where: { id: guildId },
      data: updates,
    });

    await this.set(guildId, guild);
    return guild;
  }
}
