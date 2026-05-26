import { Listener, Events } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';

export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageUpdate });
  }

  public async run(oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) {
    if (oldMsg.partial || newMsg.partial) return;
    await (this.container.client as any).logging.logMessageEdit(oldMsg, newMsg);
  }
}
