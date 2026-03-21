'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const Guild            = require('../models/Guild');
const starboardService = require('../services/starboardService');

module.exports = {
  name: Events.MessageReactionAdd,

  async execute(reaction, user, client) {
    if (user.bot) return;

    // Fetch partial reaction/message if needed
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    if (!reaction.message.guild) return;

    const message = reaction.message;
    const guild   = await Guild.getOrCreate(message.guild.id);

    // ── Starboard check ───────────────────────────────────────────────────────
    if (
      guild.starboard?.enabled &&
      reaction.emoji.name === (guild.starboard.emoji || '⭐')
    ) {
      try {
        await starboardService.handleReaction(reaction, guild, client);
      } catch { /* ignore */ }
    }

    // ── Suggestion vote tracking ──────────────────────────────────────────────
    // When someone reacts ✅ or ❌ in the suggestion channel, update vote counts
    if (
      guild.suggestionChannelId &&
      message.channel.id === guild.suggestionChannelId &&
      (reaction.emoji.name === '✅' || reaction.emoji.name === '❌')
    ) {
      try {
        const Suggestion = require('../models/Suggestion');
        const doc        = await Suggestion.findOne({ messageId: message.id });
        if (doc && !doc.voters.includes(user.id)) {
          if (reaction.emoji.name === '✅') doc.upvotes++;
          if (reaction.emoji.name === '❌') doc.downvotes++;
          doc.voters.push(user.id);
          await doc.save();
        }
      } catch { /* ignore */ }
    }
  },
};
