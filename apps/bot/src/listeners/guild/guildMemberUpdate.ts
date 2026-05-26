import { Listener, Events } from '@sapphire/framework';
import { GuildMember, PartialGuildMember } from 'discord.js';

export class GuildMemberUpdateListener extends Listener<typeof Events.GuildMemberUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberUpdate });
  }

  public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    if (oldMember.partial) return;
    const client = this.container.client as any;

    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      await client.logging.logNicknameChange(newMember, oldMember.nickname, newMember.nickname);
    }

    // Role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (addedRoles.size > 0 || removedRoles.size > 0) {
      await client.logging.logRoleUpdate(newMember, [...addedRoles.values()], [...removedRoles.values()]);
    }

    // Boost detection
    if (!oldMember.premiumSince && newMember.premiumSince) {
      await client.logging.logBoost(newMember);
    }
  }
}
