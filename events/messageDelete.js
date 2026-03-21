'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService = require('../services/logService');
const Guild      = require('../models/Guild');

module.exports = {
  name: Events.MessageDelete,

  async execute(message, client) {
    if (!message.guild) return;
    if (message.author?.bot) return;

    // ── Populate snipe cache ──────────────────────────────────────────────────
    if (message.content || message.attachments.size > 0) {
      if (!client.snipeCache) client.snipeCache = new Map();
      client.snipeCache.set(message.channel.id, {
        content:    message.content      || null,
        authorId:   message.author?.id   || null,
        authorTag:  message.author?.tag  || 'Unknown',
        imageUrl:   message.attachments.first()?.url || null,
        deletedAt:  new Date(),
      });
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    try {
      const guild = await Guild.getOrCreate(message.guild.id);
      if (!guild.logChannels?.messageDelete) return;

      await logService.send(client, guild.logChannels.messageDelete, {
        type:  'messageDelete',
        color: 'error',
        title: 'Message Deleted',
        fields: [
          { name: 'Author',  value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Content', value: message.content ? (message.content.slice(0, 1020) || '*empty*') : '*No text content*', inline: false },
        ],
      });
    } catch { /* ignore log failures */ }
  },
};
