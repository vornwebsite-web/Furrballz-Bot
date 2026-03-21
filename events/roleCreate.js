'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent, PermissionsBitField } = require('discord.js');
const logService      = require('../services/logService');
const antiNukeService = require('../services/antiNukeService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.GuildRoleCreate,

  async execute(role, client) {
    const guild = await Guild.getOrCreate(role.guild.id);

    try {
      const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate }).catch(() => null);
      const entry = logs?.entries.first();
      if (entry?.executor && !entry.executor.bot) {
        await antiNukeService.track(role.guild, entry.executor.id, 'roleCreate', client);
      }
    } catch { /* ignore */ }

    try {
      if (!guild.logChannels?.roleCreate) return;
      const logs  = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate }).catch(() => null);
      const entry = logs?.entries.first();

      await logService.send(client, guild.logChannels.roleCreate, {
        type:  'roleCreate',
        color: 'success',
        title: 'Role Created',
        fields: [
          { name: 'Role',       value: `<@&${role.id}> (${role.name})`, inline: true },
          { name: 'Color',      value: role.hexColor, inline: true },
          { name: 'Created by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
          { name: 'Hoisted',    value: String(role.hoist), inline: true },
          { name: 'Mentionable',value: String(role.mentionable), inline: true },
          { name: 'Key Permissions', value: formatPerms(role.permissions) || 'None', inline: false },
        ],
      });
    } catch { /* ignore */ }
  },
};

function formatPerms(perms) {
  const interesting = [
    'Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles',
    'ManageMessages', 'BanMembers', 'KickMembers', 'MentionEveryone',
  ];
  return interesting
    .filter(p => perms.has(PermissionsBitField.Flags[p]))
    .join(', ');
}
