'use strict';

const { Events, AuditLogEvent } = require('discord.js');
const logService      = require('../services/logService');
const antiNukeService = require('../services/antiNukeService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    if (!channel.guild) return;
    const guild = await Guild.getOrCreate(channel.guild.id);

    try {
      const logs  = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
      const entry = logs?.entries.first();
      if (entry?.executor && !entry.executor.bot) {
        await antiNukeService.track(channel.guild, entry.executor.id, 'channelDelete', client);
      }
    } catch { /* ignore */ }

    try {
      if (!guild.logChannels?.channelDelete) return;
      const logs  = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
      const entry = logs?.entries.first();
      await logService.send(client, guild.logChannels.channelDelete, {
        type: 'channelDelete', color: 'error', title: 'Channel Deleted',
        fields: [
          { name: 'Channel', value: `#${channel.name}`, inline: true },
          { name: 'Type',    value: String(channel.type), inline: true },
          { name: 'Deleted by', value: entry?.executor ? `<@${entry.executor.id}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
