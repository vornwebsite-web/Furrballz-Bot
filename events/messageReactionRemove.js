'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const Guild            = require('../models/Guild');
const starboardService = require('../services/starboardService');

module.exports = {
  name: Events.MessageReactionRemove,

  async execute(reaction, user, client) {
    if (user.bot) return;

    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    if (!reaction.message.guild) return;

    const message = reaction.message;
    const guild   = await Guild.getOrCreate(message.guild.id);

    // ── Starboard unstar ──────────────────────────────────────────────────────
    if (
      guild.starboard?.enabled &&
      reaction.emoji.name === (guild.starboard.emoji || '⭐')
    ) {
      try {
        await starboardService.handleUnreaction(reaction, guild, client);
      } catch { /* ignore */ }
    }

    // ── Suggestion vote removal ───────────────────────────────────────────────
    // When someone removes their ✅ or ❌ reaction, subtract from vote counts
    if (
      guild.suggestionChannelId &&
      message.channel.id === guild.suggestionChannelId &&
      (reaction.emoji.name === '✅' || reaction.emoji.name === '❌')
    ) {
      try {
        const Suggestion = require('../models/Suggestion');
        const doc        = await Suggestion.findOne({ messageId: message.id });
        if (doc && doc.voters.includes(user.id)) {
          if (reaction.emoji.name === '✅') doc.upvotes   = Math.max(0, doc.upvotes - 1);
          if (reaction.emoji.name === '❌') doc.downvotes = Math.max(0, doc.downvotes - 1);
          doc.voters = doc.voters.filter(id => id !== user.id);
          await doc.save();
        }
      } catch { /* ignore */ }
    }
  },
};
