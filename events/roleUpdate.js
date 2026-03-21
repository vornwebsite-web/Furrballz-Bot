'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.GuildRoleUpdate,

  async execute(oldRole, newRole, client) {
    const guild = await Guild.getOrCreate(newRole.guild.id);

    try {
      if (!guild.logChannels?.roleUpdate) return;

      const changes = [];
      if (oldRole.name       !== newRole.name)       changes.push({ name: 'Name',        value: `\`${oldRole.name}\` → \`${newRole.name}\`` });
      if (oldRole.hexColor   !== newRole.hexColor)   changes.push({ name: 'Color',       value: `\`${oldRole.hexColor}\` → \`${newRole.hexColor}\`` });
      if (oldRole.hoist      !== newRole.hoist)      changes.push({ name: 'Hoisted',     value: `${oldRole.hoist} → ${newRole.hoist}` });
      if (oldRole.mentionable !== newRole.mentionable) changes.push({ name: 'Mentionable', value: `${oldRole.mentionable} → ${newRole.mentionable}` });

      // Permission diff
      const added   = newRole.permissions.missing(oldRole.permissions);
      const removed = oldRole.permissions.missing(newRole.permissions);
      if (added.length)   changes.push({ name: 'Permissions Added',   value: added.join(', ').slice(0, 1024) });
      if (removed.length) changes.push({ name: 'Permissions Removed', value: removed.join(', ').slice(0, 1024) });

      if (changes.length === 0) return;

      const logs  = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate }).catch(() => null);
      const entry = logs?.entries.first();

      await logService.send(client, guild.logChannels.roleUpdate, {
        type:  'roleUpdate',
        color: 'info',
        title: 'Role Updated',
        fields: [
          { name: 'Role',       value: `<@&${newRole.id}> (${newRole.name})`, inline: true },
          { name: 'Updated by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
          ...changes.map(c => ({ name: c.name, value: c.value, inline: false })),
        ],
      });
    } catch { /* ignore */ }
  },
};
