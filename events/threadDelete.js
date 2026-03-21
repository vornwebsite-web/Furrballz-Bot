'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.ThreadDelete,

  async execute(thread, client) {
    if (!thread.guild) return;

    try {
      const guild = await Guild.getOrCreate(thread.guild.id);
      if (!guild.logChannels?.channelDelete) return;

      await logService.send(client, guild.logChannels.channelDelete, {
        type:  'threadDelete',
        color: 'error',
        title: 'Thread Deleted',
        fields: [
          { name: 'Thread', value: `#${thread.name}`, inline: true },
          { name: 'Parent', value: thread.parent ? `<#${thread.parent.id}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
