import { SapphireClient } from '@sapphire/framework';
import { GuildCache } from '../cache/GuildCache';
import { ModerationService } from '../services/ModerationService';
import { LoggingService } from '../services/LoggingService';
import { TicketService } from '../services/TicketService';
import { VerificationService } from '../services/VerificationService';
import { AutomodService } from '../services/AutomodService';
import { AnalyticsService } from '../services/AnalyticsService';
import { SchedulerService } from '../services/SchedulerService';
import Redis from 'ioredis';
import { env } from '../../env';
import { logger } from '../utils/logger';

export class ExtendedClient extends SapphireClient {
  public readonly guildCache: GuildCache;
  public readonly redis: Redis;
  public readonly moderation: ModerationService;
  public readonly logging: LoggingService;
  public readonly tickets: TicketService;
  public readonly verification: VerificationService;
  public readonly automod: AutomodService;
  public readonly analytics: AnalyticsService;
  public readonly scheduler: SchedulerService;

  constructor() {
    super({
      intents: [],
      logger: { level: 10 },
    });

    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.guildCache = new GuildCache(this.redis);
    this.logging = new LoggingService(this);
    this.moderation = new ModerationService(this);
    this.tickets = new TicketService(this);
    this.verification = new VerificationService(this);
    this.automod = new AutomodService(this);
    this.analytics = new AnalyticsService(this);
    this.scheduler = new SchedulerService(this);
  }

  public override async login(token: string): Promise<string> {
    try {
      await this.redis.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn('Redis connection failed, operating without cache:', err);
    }

    await this.scheduler.start();
    return super.login(token);
  }

  public override destroy(): void {
    this.redis.disconnect();
    this.scheduler.stop();
    super.destroy();
  }
}

declare module '@sapphire/framework' {
  interface SapphireClient {
    guildCache: GuildCache;
    redis: Redis;
    moderation: ModerationService;
    logging: LoggingService;
    tickets: TicketService;
    verification: VerificationService;
    automod: AutomodService;
    analytics: AnalyticsService;
    scheduler: SchedulerService;
  }
}
