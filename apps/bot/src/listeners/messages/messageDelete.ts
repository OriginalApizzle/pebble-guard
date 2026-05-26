import { Listener, Events } from '@sapphire/framework';
import { Message, PartialMessage } from 'discord.js';

export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageDelete });
  }

  public async run(message: Message | PartialMessage) {
    if (message.partial) return;
    await (this.container.client as any).logging.logMessageDelete(message);
  }
}
