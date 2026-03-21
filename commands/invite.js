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
      .setName('altprotection')
      .setDescription('Configure alt account protection')
      .addStringOption(o => o.setName('action').setDescription('What to do with detected alts').setRequired(true)
        .addChoices(
          { name: 'Enable — Kick alts',       value: 'kick'  },
          { name: 'Enable — Ban alts',        value: 'ban'   },
          { name: 'Enable — Alert mods only', value: 'alert' },
          { name: 'Disable',                  value: 'off'   },
        ))
      .addIntegerOption(o => o.setName('min_age_days').setDescription('Minimum account age in days (default 7)').setMinValue(1).setMaxValue(365))
      .addChannelOption(o => o.setName('alert_channel').setDescription('Channel to send mod alerts (always used regardless of action)'))
      .addBooleanOption(o => o.setName('block_no_avatar').setDescription('Also flag accounts with default avatar (no profile picture)')))

    .addSubcommand(s => s
      .setName('altexempt')
      .setDescription('Exempt an inviter from alt checks (their invites skip alt protection)')
      .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true)
        .addChoices({ name: 'Add exemption', value: 'add' }, { name: 'Remove exemption', value: 'remove' }))
      .addUserOption(o => o.setName('user').setDescription('Inviter to exempt').setRequired(true)))

    .addSubcommand(s => s
      .setName('altstatus')
      .setDescription('View current alt protection settings'))

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

    else if (sub === 'altprotection') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const action       = interaction.options.getString('action');
      const minAge       = interaction.options.getInteger('min_age_days');
      const alertChannel = interaction.options.getChannel('alert_channel');
      const blockAvatar  = interaction.options.getBoolean('block_no_avatar');
      const guildDoc     = await Guild.getOrCreate(interaction.guild.id);

      if (action === 'off') {
        guildDoc.altProtection.enabled = false;
        await guildDoc.save();
        return interaction.reply({ embeds: [success('Alt account protection **disabled**.')], ephemeral: true });
      }

      guildDoc.altProtection.enabled = true;
      guildDoc.altProtection.action  = action;
      if (minAge       !== null) guildDoc.altProtection.minAccountAgeDays  = minAge;
      if (alertChannel)         guildDoc.altProtection.alertChannelId      = alertChannel.id;
      if (blockAvatar  !== null) guildDoc.altProtection.blockDefaultAvatar = blockAvatar;
      guildDoc.markModified('altProtection');
      await guildDoc.save();

      await interaction.reply({ embeds: [success([
        `**Alt protection:** 🟢 Enabled`,
        `**Action:** ${action === 'kick' ? '👢 Kick' : action === 'ban' ? '🔨 Ban' : '⚠️ Alert only'}`,
        `**Min account age:** ${guildDoc.altProtection.minAccountAgeDays} days`,
        `**Alert channel:** ${guildDoc.altProtection.alertChannelId ? `<#${guildDoc.altProtection.alertChannelId}>` : 'Not set'}`,
        `**Block no-avatar accounts:** ${guildDoc.altProtection.blockDefaultAvatar ? 'Yes' : 'No'}`,
      ].join('\n'), '🛡️ Alt Protection Updated')], ephemeral: true });
    }

    else if (sub === 'altexempt') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const action   = interaction.options.getString('action');
      const user     = interaction.options.getUser('user');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);

      if (action === 'add') {
        if (!guildDoc.altProtection.ignoreInviterId.includes(user.id)) {
          guildDoc.altProtection.ignoreInviterId.push(user.id);
          guildDoc.markModified('altProtection');
          await guildDoc.save();
        }
        await interaction.reply({ embeds: [success(`<@${user.id}> is now **exempt** from alt protection.\nUsers they invite will skip the alt check.`)], ephemeral: true });
      } else {
        guildDoc.altProtection.ignoreInviterId = guildDoc.altProtection.ignoreInviterId.filter(id => id !== user.id);
        guildDoc.markModified('altProtection');
        await guildDoc.save();
        await interaction.reply({ embeds: [success(`<@${user.id}> exemption **removed**. Their invites will now be subject to alt checks.`)], ephemeral: true });
      }
    }

    else if (sub === 'altstatus') {
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      const cfg      = guildDoc.altProtection;
      await interaction.reply({ embeds: [info([
        `**Enabled:** ${cfg.enabled ? '🟢 Yes' : '🔴 No'}`,
        `**Action:** ${cfg.action === 'kick' ? '👢 Kick' : cfg.action === 'ban' ? '🔨 Ban' : '⚠️ Alert only'}`,
        `**Min account age:** ${cfg.minAccountAgeDays} days`,
        `**Block no-avatar:** ${cfg.blockDefaultAvatar ? 'Yes' : 'No'}`,
        `**Alert channel:** ${cfg.alertChannelId ? `<#${cfg.alertChannelId}>` : 'Not set'}`,
        `**Exempt inviters:** ${cfg.ignoreInviterId.length > 0 ? cfg.ignoreInviterId.map(id => `<@${id}>`).join(', ') : 'None'}`,
      ].join('\n'), '🛡️ Alt Protection Status')], ephemeral: true });
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
      const lines = lb.map((i, idx) => `${ordinal(idx + 1)}. <@${i.inviterId}> — **${i.realUses}** real invite${i.realUses === 1 ? '' : 's'} *(${i.rawUses} total)*`);
      await paginate(interaction, [neutral(lines.join('\n'), '📨 Invite Leaderboard\n*Real invites = members currently in server*')]);
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
