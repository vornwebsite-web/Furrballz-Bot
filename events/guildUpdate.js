'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.GuildUpdate,

  async execute(oldGuild, newGuild, client) {
    const guild = await Guild.getOrCreate(newGuild.id);

    try {
      if (!guild.logChannels?.guildUpdate) return;

      const changes = [];
      if (oldGuild.name               !== newGuild.name)               changes.push({ name: 'Name',               value: `${oldGuild.name} → ${newGuild.name}` });
      if (oldGuild.description        !== newGuild.description)        changes.push({ name: 'Description',        value: `${oldGuild.description || 'None'} → ${newGuild.description || 'None'}` });
      if (oldGuild.verificationLevel  !== newGuild.verificationLevel)  changes.push({ name: 'Verification Level', value: `${oldGuild.verificationLevel} → ${newGuild.verificationLevel}` });
      if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push({ name: 'Content Filter', value: `${oldGuild.explicitContentFilter} → ${newGuild.explicitContentFilter}` });
      if (oldGuild.icon               !== newGuild.icon)               changes.push({ name: 'Icon',               value: 'Server icon changed' });
      if (oldGuild.banner             !== newGuild.banner)             changes.push({ name: 'Banner',             value: 'Server banner changed' });
      if (oldGuild.afkChannelId       !== newGuild.afkChannelId)       changes.push({ name: 'AFK Channel',        value: `${oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : 'None'} → ${newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : 'None'}` });

      if (changes.length === 0) return;

      const logs  = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate }).catch(() => null);
      const entry = logs?.entries.first();

      await logService.send(client, guild.logChannels.guildUpdate, {
        type:  'guildUpdate',
        color: 'info',
        title: 'Server Updated',
        thumbnail: newGuild.iconURL(),
        fields: [
          { name: 'Updated by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
          ...changes.map(c => ({ name: c.name, value: c.value.slice(0, 1024), inline: false })),
        ],
      });
    } catch { /* ignore */ }
  },
};
