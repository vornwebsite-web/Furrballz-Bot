'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }      = require('../utils/permissions');
const { ordinal, number } = require('../utils/formatters');
const { paginate }        = require('../utils/paginator');
const inviteTrackerService = require('../services/inviteTrackerService');
const InviteCache          = require('../models/InviteCache');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Invite tracker')
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set the invite log channel for join notifications')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for invite join messages').setRequired(true)))

    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable invite join notifications'))

    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a new invite link')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for the invite (defaults to current)'))
      .addIntegerOption(o => o.setName('max_uses').setDescription('Max uses (0 = unlimited)').setMinValue(0))
      .addStringOption(o => o.setName('expires').setDescription('Expiry e.g. 1h, 1d (leave empty for never)')))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all active invites with usage stats'))
    .addSubcommand(s => s
      .setName('info')
      .setDescription('Get info about an invite code')
      .addStringOption(o => o.setName('code').setDescription('Invite code').setRequired(true)))
    .addSubcommand(s => s
      .setName('leaderboard')
      .setDescription('See who has invited the most members'))
    .addSubcommand(s => s
      .setName('purge')
      .setDescription('Delete all expired/unused invites')
      .addBooleanOption(o => o.setName('confirm').setDescription('Confirm deletion').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const channel  = interaction.options.getChannel('channel');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.inviteLogChannelId = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Invite join notifications will be posted to <#${channel.id}>.\n\nWhen a member joins I'll show who invited them and the inviter's total invite count.`)], ephemeral: true });
    }

    else if (sub === 'disable') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.inviteLogChannelId = null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success('Invite join notifications disabled.')], ephemeral: true });
    }

    else if (sub === 'create') {
      const channel  = interaction.options.getChannel('channel') || interaction.channel;
      const maxUses  = interaction.options.getInteger('max_uses') ?? 0;
      const expires  = interaction.options.getString('expires');
      let maxAge = 0;
      if (expires) {
        const { parseWithBounds } = require('../utils/timeParser');
        const dur = parseWithBounds(expires, { min: 60000, max: 7 * 24 * 60 * 60 * 1000 });
        if (!dur.valid) return errorReply(interaction, dur.reason);
        maxAge = Math.floor(dur.ms / 1000);
      }
      const invite = await channel.createInvite({ maxUses, maxAge, reason: `Created by ${interaction.user.tag}` });
      await interaction.reply({ embeds: [success(`Invite created!\n**Link:** https://discord.gg/${invite.code}\n**Max uses:** ${maxUses || 'Unlimited'}\n**Expires:** ${maxAge ? `${maxAge / 3600}h` : 'Never'}`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const invites = await interaction.guild.invites.fetch().catch(() => null);
      if (!invites?.size) return interaction.reply({ embeds: [info('No active invites.')], ephemeral: true });
      const lines = [...invites.values()]
        .sort((a, b) => (b.uses || 0) - (a.uses || 0))
        .map(i => `\`${i.code}\` — **${i.uses || 0}** uses — by ${i.inviter?.tag || 'Unknown'}${i.maxUses ? ` (max ${i.maxUses})` : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 10) pages.push(neutral(lines.slice(i, i + 10).join('\n'), `Invites (${invites.size})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'info') {
      const code   = interaction.options.getString('code').replace('https://discord.gg/', '').replace('discord.gg/', '');
      const invite = await interaction.client.fetchInvite(code).catch(() => null);
      if (!invite) return errorReply(interaction, 'Invite not found or expired.');
      await interaction.reply({ embeds: [info([
        `**Code:** \`${invite.code}\``,
        `**Server:** ${invite.guild?.name || 'Unknown'}`,
        `**Channel:** #${invite.channel?.name || 'Unknown'}`,
        `**Inviter:** ${invite.inviter?.tag || 'Unknown'}`,
        `**Uses:** ${invite.uses ?? '?'} / ${invite.maxUses || '∞'}`,
        `**Expires:** ${invite.expiresAt ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Never'}`,
      ].join('\n'), 'Invite Info')], ephemeral: true });
    }

    else if (sub === 'leaderboard') {
      const lb = await inviteTrackerService.getLeaderboard(interaction.guild.id, 20);
      if (!lb.length) return interaction.reply({ embeds: [info('No invite data yet.')], ephemeral: true });
      const lines = lb.map((i, idx) => `${ordinal(idx + 1)}. <@${i.inviterId || 'Unknown'}> — \`${i.inviteCode}\` — **${number(i.uses)}** uses`);
      await paginate(interaction, [neutral(lines.join('\n'), 'Invite Leaderboard')]);
    }

    else if (sub === 'purge') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const confirm = interaction.options.getBoolean('confirm');
      if (!confirm) return errorReply(interaction, 'You must confirm the purge.');
      await interaction.deferReply({ ephemeral: true });
      const invites = await interaction.guild.invites.fetch().catch(() => null);
      if (!invites) return interaction.editReply({ embeds: [error('Failed to fetch invites.')] });
      let deleted = 0;
      for (const [, invite] of invites) {
        if ((invite.uses === 0 || (invite.expiresAt && invite.expiresAt < new Date()))) {
          await invite.delete('Purge unused invites').catch(() => {});
          deleted++;
        }
      }
      await interaction.editReply({ embeds: [success(`Purged **${deleted}** unused/expired invite(s).`)] });
    }
  },
};
