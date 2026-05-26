import { Listener, Events } from '@sapphire/framework';
import { GuildMember, PartialGuildMember } from 'discord.js';

export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.GuildMemberRemove });
  }

  public async run(member: GuildMember | PartialGuildMember) {
    if (member.partial) return;
    await (this.container.client as any).logging.logMemberLeave(member);
  }
}
