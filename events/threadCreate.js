'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.ThreadCreate,

  async execute(thread, newlyCreated, client) {
    if (!thread.guild || !newlyCreated) return;

    // Auto-join bot to thread so it can read messages
    try {
      await thread.join();
    } catch { /* ignore */ }

    try {
      const guild = await Guild.getOrCreate(thread.guild.id);
      if (!guild.logChannels?.channelCreate) return;

      await logService.send(client, guild.logChannels.channelCreate, {
        type:  'threadCreate',
        color: 'success',
        title: 'Thread Created',
        fields: [
          { name: 'Thread',  value: `<#${thread.id}> (${thread.name})`, inline: true },
          { name: 'Parent',  value: thread.parent ? `<#${thread.parent.id}>` : 'Unknown', inline: true },
          { name: 'Creator', value: thread.ownerId ? `<@${thread.ownerId}>` : 'Unknown', inline: true },
        ],
      });
    } catch { /* ignore */ }
  },
};
