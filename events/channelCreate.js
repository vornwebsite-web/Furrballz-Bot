'use strict';

const { Events, AuditLogEvent } = require('discord.js');
const logService      = require('../services/logService');
const antiNukeService = require('../services/antiNukeService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = await Guild.getOrCreate(channel.guild.id);

    // Anti-nuke tracking
    try {
      const logs  = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
      const entry = logs?.entries.first();
      if (entry?.executor && !entry.executor.bot) {
        await antiNukeService.track(channel.guild, entry.executor.id, 'channelCreate', client);
      }
    } catch { /* ignore */ }

    try {
      if (!guild.logChannels?.channelCreate) return;
      const logs  = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
      const entry = logs?.entries.first();
      await logService.send(client, guild.logChannels.channelCreate, {
        type: 'channelCreate', color: 'success', title: 'Channel Created',
        fields: [
          { name: 'Channel',   value: `<#${channel.id}> (${channel.name})`, inline: true },
          { name: 'Type',      value: String(channel.type), inline: true },
          { name: 'Creator',   value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
