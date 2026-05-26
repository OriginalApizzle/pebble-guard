import { Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/utils/embeds';

export class VerifyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'verify' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('verify')
        .setDescription('Verification commands')
        .addSubcommand(sub =>
          sub.setName('panel').setDescription('Create verification panel')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('code').setDescription('Submit verification CAPTCHA code')
            .addStringOption(o => o.setName('code').setDescription('CAPTCHA code').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('manual').setDescription('Manually verify a user (staff only)')
            .addUserOption(o => o.setName('user').setDescription('User to verify').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('raidmode').setDescription('Toggle raid mode')
            .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true))
        )
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
      case 'panel': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.editReply({ embeds: [errorEmbed('You need Manage Server permission')] });
        }
        const channel = interaction.options.getChannel('channel', true);
        try {
          await (this.container.client as any).verification.createVerificationPanel(interaction.guild!, channel.id);
          return interaction.editReply({ embeds: [successEmbed('Verification panel created', `Panel sent in <#${channel.id}>`)] });
        } catch (err: any) {
          return interaction.editReply({ embeds: [errorEmbed('Failed', err.message)] });
        }
      }

      case 'code': {
        const code = interaction.options.getString('code', true);
        const result = await (this.container.client as any).verification.verifyCaptcha(interaction.member, code);
        return interaction.editReply({
          embeds: [result.success ? successEmbed('Verified!', result.message) : errorEmbed('Verification Failed', result.message)],
        });
      }

      case 'manual': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.editReply({ embeds: [errorEmbed('You need Manage Roles permission')] });
        }
        const user = interaction.options.getMember('user');
        if (!user) return interaction.editReply({ embeds: [errorEmbed('User not found')] });

        const verification = await (interaction.container as any).prisma?.verification.create({
          data: {
            guildId: interaction.guild!.id,
            userId: (user as any).id,
            method: 'BUTTON',
            status: 'PENDING',
          },
        });

        const result = await (this.container.client as any).verification.completeVerification(user, verification?.id ?? 'manual');
        return interaction.editReply({
          embeds: [result.success ? successEmbed('User verified manually') : errorEmbed('Failed', result.message)],
        });
      }

      case 'raidmode': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({ embeds: [errorEmbed('Administrator required')] });
        }
        const enabled = interaction.options.getBoolean('enabled', true);
        const { prisma } = await import('@pebble-guard/database');
        await prisma.guild.update({ where: { id: interaction.guild!.id }, data: { raidMode: enabled } });
        await (this.container.client as any).guildCache.invalidate(interaction.guild!.id);
        return interaction.editReply({ embeds: [successEmbed(`Raid mode ${enabled ? '🔴 ACTIVATED' : '🟢 deactivated'}`)] });
      }

      default:
        return interaction.editReply({ embeds: [errorEmbed('Unknown subcommand')] });
    }
  }
}
