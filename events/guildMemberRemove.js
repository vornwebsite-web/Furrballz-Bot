'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member, client) {
    const guild = await Guild.getOrCreate(member.guild.id);

    // ── Log member leave ──────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.memberLeave) return;

      const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'None';

      await logService.send(client, guild.logChannels.memberLeave, {
        type:  'memberLeave',
        color: 'error',
        title: 'Member Left',
        thumbnail: member.user.displayAvatarURL(),
        fields: [
          { name: 'User',         value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Joined',       value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
          { name: 'Roles',        value: roles.slice(0, 1024), inline: false },
        ],
      });
    } catch { /* ignore */ }
  },
};
