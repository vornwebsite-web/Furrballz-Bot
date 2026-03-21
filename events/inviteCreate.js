'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService  = require('../services/logService');
const InviteCache = require('../models/InviteCache');
const Guild       = require('../models/Guild');

module.exports = {
  name: Events.InviteCreate,

  async execute(invite, client) {
    if (!invite.guild) return;

    // ── Cache invite in DB ────────────────────────────────────────────────────
    try {
      await InviteCache.findOneAndUpdate(
        { inviteCode: invite.code },
        {
          guildId:   invite.guild.id,
          inviteCode: invite.code,
          inviterId: invite.inviter?.id || null,
          uses:      invite.uses        || 0,
          maxUses:   invite.maxUses     || 0,
          expiresAt: invite.expiresAt   || null,
        },
        { upsert: true, new: true },
      );
    } catch { /* ignore */ }

    // ── Log ───────────────────────────────────────────────────────────────────
    try {
      const guild = await Guild.getOrCreate(invite.guild.id);
      if (!guild.logChannels?.inviteCreate) return;

      await logService.send(client, guild.logChannels.inviteCreate, {
        type:  'inviteCreate',
        color: 'info',
        title: 'Invite Created',
        fields: [
          { name: 'Code',      value: `\`${invite.code}\``, inline: true },
          { name: 'Creator',   value: invite.inviter ? `<@${invite.inviter.id}>` : 'Unknown', inline: true },
          { name: 'Channel',   value: invite.channel ? `<#${invite.channel.id}>` : 'Unknown', inline: true },
          { name: 'Max Uses',  value: invite.maxUses ? String(invite.maxUses) : 'Unlimited', inline: true },
          { name: 'Expires',   value: invite.expiresAt ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Never', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
