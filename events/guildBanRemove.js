'use strict';

const { Events, AuditLogEvent } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban, client) {
    const guild = await Guild.getOrCreate(ban.guild.id);
    try {
      if (!guild.logChannels?.banRemove) return;
      const logs  = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove }).catch(() => null);
      const entry = logs?.entries.first();
      const mod   = entry?.executor;
      await logService.send(client, guild.logChannels.banRemove, {
        type: 'banRemove', color: 'success', title: 'Member Unbanned',
        thumbnail: ban.user.displayAvatarURL(),
        fields: [
          { name: 'User',      value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
          { name: 'Moderator', value: mod ? `<@${mod.id}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
