'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent } = require('discord.js');
const logService      = require('../services/logService');
const antiNukeService = require('../services/antiNukeService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.GuildRoleDelete,

  async execute(role, client) {
    const guild = await Guild.getOrCreate(role.guild.id);

    try {
      const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
      const entry = logs?.entries.first();
      if (entry?.executor && !entry.executor.bot) {
        await antiNukeService.track(role.guild, entry.executor.id, 'roleDelete', client);
      }
    } catch { /* ignore */ }

    try {
      if (!guild.logChannels?.roleDelete) return;
      const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
      const entry = logs?.entries.first();

      await logService.send(client, guild.logChannels.roleDelete, {
        type:  'roleDelete',
        color: 'error',
        title: 'Role Deleted',
        fields: [
          { name: 'Role Name',  value: role.name, inline: true },
          { name: 'Color',      value: role.hexColor, inline: true },
          { name: 'Deleted by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
