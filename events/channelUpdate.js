'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, AuditLogEvent } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.ChannelUpdate,

  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    const guild = await Guild.getOrCreate(newChannel.guild.id);

    try {
      if (!guild.logChannels?.channelUpdate) return;

      const changes = [];
      if (oldChannel.name  !== newChannel.name)  changes.push({ name: 'Name',  value: `\`${oldChannel.name}\` → \`${newChannel.name}\`` });
      if (oldChannel.topic !== newChannel.topic) changes.push({ name: 'Topic', value: `${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}` });
      if (oldChannel.nsfw  !== newChannel.nsfw)  changes.push({ name: 'NSFW',  value: `${oldChannel.nsfw} → ${newChannel.nsfw}` });
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push({ name: 'Slowmode', value: `${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s` });
      }

      if (changes.length === 0) return;

      const logs  = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate }).catch(() => null);
      const entry = logs?.entries.first();

      await logService.send(client, guild.logChannels.channelUpdate, {
        type:  'channelUpdate',
        color: 'info',
        title: 'Channel Updated',
        fields: [
          { name: 'Channel',    value: `<#${newChannel.id}> (${newChannel.name})`, inline: true },
          { name: 'Updated by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
          ...changes.map(c => ({ name: c.name, value: c.value.slice(0, 1024), inline: false })),
        ],
      });
    } catch { /* ignore */ }
  },
};
