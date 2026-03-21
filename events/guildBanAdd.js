'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent } = require('discord.js');
const logService      = require('../services/logService');
const antiNukeService = require('../services/antiNukeService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.GuildBanAdd,

  async execute(ban, client) {
    const guild = await Guild.getOrCreate(ban.guild.id);

    // ── Anti-nuke ban tracking ────────────────────────────────────────────────
    try {
      const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
      const entry = logs?.entries.first();
      if (entry && entry.executor && !entry.executor.bot) {
        await antiNukeService.track(ban.guild, entry.executor.id, 'ban', client);
      }
    } catch { /* ignore */ }

    // ── Log ───────────────────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.banAdd) return;
      const logs   = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
      const entry  = logs?.entries.first();
      const reason = ban.reason || entry?.reason || 'No reason provided';
      const mod    = entry?.executor;

      await logService.send(client, guild.logChannels.banAdd, {
        type:  'banAdd',
        color: 'error',
        title: 'Member Banned',
        thumbnail: ban.user.displayAvatarURL(),
        fields: [
          { name: 'User',      value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
          { name: 'Moderator', value: mod ? `<@${mod.id}>` : 'Unknown', inline: true },
          { name: 'Reason',    value: reason.slice(0, 1024), inline: false },
        ],
      });
    } catch { /* ignore */ }
  },
};
