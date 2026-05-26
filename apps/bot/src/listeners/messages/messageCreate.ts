import { Listener, Events } from '@sapphire/framework';
import { Message } from 'discord.js';

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.MessageCreate });
  }

  public async run(message: Message) {
    if (!message.guild || message.author.bot) return;
    await (this.container.client as any).automod.analyzeMessage(message);
  }
}
