'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService     = require('../services/logService');
const Guild          = require('../models/Guild');
const automodService = require('../services/automodService');

module.exports = {
  name: Events.MessageUpdate,

  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild)       return;
    if (newMessage.author?.bot)  return;
    if (oldMessage.content === newMessage.content) return; // embed unfurl, ignore

    const guild = await Guild.getOrCreate(newMessage.guild.id);

    // ── Re-run automod on edited content ─────────────────────────────────────
    if (guild.automod?.enabled) {
      try {
        await automodService.check(newMessage, guild);
      } catch { /* ignore */ }
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.messageUpdate) return;

      await logService.send(client, guild.logChannels.messageUpdate, {
        type:  'messageUpdate',
        color: 'warning',
        title: 'Message Edited',
        fields: [
          { name: 'Author',  value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: true },
          { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
          { name: 'Jump',    value: `[View Message](${newMessage.url})`, inline: true },
          { name: 'Before',  value: (oldMessage.content?.slice(0, 1020) || '*empty*'), inline: false },
          { name: 'After',   value: (newMessage.content?.slice(0, 1020) || '*empty*'), inline: false },
        ],
      });
    } catch { /* ignore */ }
  },
};
