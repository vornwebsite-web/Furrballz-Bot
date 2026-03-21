'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logger         = require('../utils/logger');
const Guild          = require('../models/Guild');
const automodService = require('../services/automodService');
const levelService   = require('../services/levelService');

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    // Ignore bots and DMs
    if (message.author.bot) return;
    if (!message.guild)     return;

    const guild = await Guild.getOrCreate(message.guild.id);

    // ── Snipe cache (store for /util snipe) ───────────────────────────────────
    // (messageDelete event clears this; we store here for reference)

    // ── AFK check — if someone pings an AFK user, notify ─────────────────────
    if (message.mentions.users.size > 0) {
      const User = require('../models/User');
      for (const [, mentionedUser] of message.mentions.users) {
        if (mentionedUser.bot) continue;
        try {
          const userDoc = await User.findOne({ userId: mentionedUser.id, guildId: message.guild.id });
          if (userDoc?.afkMessage) {
            await message.reply({
              content: `**${mentionedUser.username}** is currently AFK: ${userDoc.afkMessage}`,
              allowedMentions: { repliedUser: false },
            });
            break; // only reply once even if multiple AFK users mentioned
          }
        } catch { /* ignore */ }
      }
    }

    // ── Remove AFK status if author was AFK ───────────────────────────────────
    try {
      const User = require('../models/User');
      const userDoc = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (userDoc?.afkMessage) {
        userDoc.afkMessage = null;
        userDoc.afkSince   = null;
        await userDoc.save();
        const msg = await message.reply({
          content: `Welcome back, **${message.author.username}**! Your AFK has been removed.`,
          allowedMentions: { repliedUser: false },
        });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      }
    } catch { /* ignore */ }

    // ── Automod ───────────────────────────────────────────────────────────────
    if (guild.automod?.enabled) {
      try {
        const deleted = await automodService.check(message, guild);
        if (deleted) return; // message was deleted, stop processing
      } catch (err) {
        logger.error(`[MessageCreate] Automod error: ${err.message}`);
      }
    }

    // ── Anti-spam ─────────────────────────────────────────────────────────────
    if (guild.antispam?.enabled) {
      try {
        const antispamService = require('../services/automodService');
        await antispamService.checkSpam(message, guild);
      } catch (err) {
        logger.error(`[MessageCreate] Antispam error: ${err.message}`);
      }
    }

    // ── Suggestion channel — auto react with ✅ and ❌ ─────────────────────────
    if (guild.suggestionChannelId && message.channel.id === guild.suggestionChannelId) {
      // Ignore bot messages and very short messages
      if (message.content.length >= 5) {
        try {
          await message.react('✅');
          await message.react('❌');
          // Save suggestion to DB
          const Suggestion = require('../models/Suggestion');
          const doc = await Suggestion.create({
            guildId:   message.guild.id,
            authorId:  message.author.id,
            content:   message.content.slice(0, 2000),
            channelId: message.channel.id,
            messageId: message.id,
          });
          // Update doc with message ID for later reference
          doc.messageId = message.id;
          await doc.save();
        } catch (err) {
          logger.warn(`[MessageCreate] Suggestion react failed: ${err.message}`);
        }
      }
      return; // Don't grant XP in suggestion channel
    }
    if (guild.counting?.enabled && message.channel.id === guild.counting.channelId) {
      try {
        const expected = (guild.counting.count || 0) + 1;
        const num      = parseInt(message.content.trim(), 10);

        if (isNaN(num) || num !== expected || message.author.id === guild.counting.lastUserId) {
          await message.react('❌').catch(() => {});
          const broken = guild.counting.count;
          guild.counting.count      = 0;
          guild.counting.lastUserId = null;
          guild.counting.brokenBy   = message.author.id;
          guild.counting.resetCount = (guild.counting.resetCount || 0) + 1;
          await guild.save();
          await message.reply({
            content: `❌ **${message.author.username}** broke the count at **${broken}**! Start again from 1.`,
            allowedMentions: { repliedUser: false },
          });
        } else {
          await message.react('✅').catch(() => {});
          if (num > (guild.counting.highscore || 0)) {
            guild.counting.highscore = num;
          }
          guild.counting.count      = num;
          guild.counting.lastUserId = message.author.id;
          await guild.save();
        }
      } catch (err) {
        logger.error(`[MessageCreate] Counting error: ${err.message}`);
      }
      return; // don't grant XP in counting channel
    }

    // ── Sticky message repost ─────────────────────────────────────────────────
    if (guild.stickyMessages?.has(message.channel.id)) {
      try {
        const stickyText = guild.stickyMessages.get(message.channel.id);
        // Delete previous sticky if tracked
        const stickyKey = `sticky_${message.channel.id}`;
        if (client._stickyCache) {
          const oldMsgId = client._stickyCache.get(stickyKey);
          if (oldMsgId) {
            const oldMsg = await message.channel.messages.fetch(oldMsgId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => {});
          }
        } else {
          client._stickyCache = new Map();
        }
        const sent = await message.channel.send({ content: stickyText });
        client._stickyCache.set(stickyKey, sent.id);
      } catch (err) {
        logger.error(`[MessageCreate] Sticky error: ${err.message}`);
      }
    }

    // ── XP / Leveling ─────────────────────────────────────────────────────────
    if (guild.leveling?.enabled) {
      try {
        await levelService.grantXP(message, guild, client);
      } catch (err) {
        logger.error(`[MessageCreate] Level XP error: ${err.message}`);
      }
    }

    // ── Total message count ───────────────────────────────────────────────────
    try {
      const User = require('../models/User');
      await User.updateOne(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { totalMessages: 1 } },
        { upsert: true },
      );
    } catch { /* non-critical */ }
  },
};
