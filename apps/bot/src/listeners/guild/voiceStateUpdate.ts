import { Listener, Events } from '@sapphire/framework';
import { VoiceState } from 'discord.js';

export class VoiceStateUpdateListener extends Listener<typeof Events.VoiceStateUpdate> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.VoiceStateUpdate });
  }

  public async run(oldState: VoiceState, newState: VoiceState) {
    await (this.container.client as any).logging.logVoiceStateUpdate(oldState, newState);
  }
}
