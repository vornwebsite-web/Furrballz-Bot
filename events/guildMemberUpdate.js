'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService       = require('../services/logService');
const antiNukeService  = require('../services/antiNukeService');
const Guild            = require('../models/Guild');

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember, client) {
    const guild = await Guild.getOrCreate(newMember.guild.id);

    // ── Boost detection ───────────────────────────────────────────────────────
    const wasBooster = oldMember.premiumSince;
    const isBooster  = newMember.premiumSince;

    if (!wasBooster && isBooster && guild.boostChannelId && guild.boostMessage) {
      try {
        const channel = newMember.guild.channels.cache.get(guild.boostChannelId);
        if (channel) {
          const msg = guild.boostMessage
            .replace('{user}', `<@${newMember.id}>`)
            .replace('{username}', newMember.user.username)
            .replace('{server}', newMember.guild.name);
          await channel.send({ content: msg });
        }
      } catch { /* ignore */ }
    }

    // ── Anti-nuke — mass role strip detection ─────────────────────────────────
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (removedRoles.size >= 3) {
      try {
        // Fetch executor from audit log
        const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null);
        const entry = logs?.entries.first();
        if (entry && entry.target?.id === newMember.id) {
          await antiNukeService.track(newMember.guild, entry.executor?.id, 'roleStrip', client);
        }
      } catch { /* ignore */ }
    }

    // ── Log role changes ──────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.memberUpdate) return;

      const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const nicknameChanged = oldMember.nickname !== newMember.nickname;

      if (addedRoles.size === 0 && removedRoles.size === 0 && !nicknameChanged) return;

      const fields = [];
      if (addedRoles.size > 0)   fields.push({ name: 'Roles Added',   value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
      if (removedRoles.size > 0) fields.push({ name: 'Roles Removed', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
      if (nicknameChanged)       fields.push({ name: 'Nickname', value: `${oldMember.nickname || 'None'} → ${newMember.nickname || 'None'}`, inline: false });

      await logService.send(client, guild.logChannels.memberUpdate, {
        type:   'memberUpdate',
        color:  'info',
        title:  'Member Updated',
        fields: [
          { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
          ...fields,
        ],
      });
    } catch { /* ignore */ }
  },
};
