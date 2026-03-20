'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const User   = require('../models/User');
const logger = require('../utils/logger');

/**
 * Calculates XP required to reach a given level.
 * Formula: 5 * (level^2) + 50 * level + 100
 * @param {number} level
 * @returns {number}
 */
function xpForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

/**
 * Grants XP to a member for sending a message, handles level-ups.
 * @param {import('discord.js').Message} message
 * @param {object} guildDoc - Mongoose Guild document
 * @param {import('discord.js').Client} client
 */
async function grantXP(message, guildDoc, client) {
  const cfg = guildDoc.leveling;
  if (!cfg?.enabled) return;

  // Ignored channels/roles check
  if (cfg.ignoredChannels?.includes(message.channel.id)) return;
  const memberRoles = message.member?.roles?.cache;
  if (memberRoles && cfg.ignoredRoles?.some(r => memberRoles.has(r))) return;

  const user = await User.getOrCreate(message.author.id, message.guild.id);

  // Cooldown check
  const now = Date.now();
  if (user.xpCooldown && now < user.xpCooldown.getTime()) return;

  const xpMin    = cfg.xpMin    ?? 15;
  const xpMax    = cfg.xpMax    ?? 40;
  const cooldown = cfg.xpCooldown ?? 60000;
  const xpGained = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

  user.xp        += xpGained;
  user.xpCooldown = new Date(now + cooldown);

  // Level-up check
  let leveledUp = false;
  while (user.xp >= xpForLevel(user.level)) {
    user.xp    -= xpForLevel(user.level);
    user.level += 1;
    leveledUp   = true;
  }

  await user.save();

  if (!leveledUp) return;

  // ── Level-up announcement ─────────────────────────────────────────────────
  try {
    const announceChannelId = cfg.announceChannel || message.channel.id;
    const channel = await client.channels.fetch(announceChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      await channel.send({
        content: `🎉 Congrats <@${message.author.id}>! You've reached **Level ${user.level}**!`,
        allowedMentions: { users: [message.author.id] },
      });
    }
  } catch (err) {
    logger.warn(`[LevelService] Announce failed: ${err.message}`);
  }

  // ── Level role rewards ────────────────────────────────────────────────────
  try {
    if (cfg.levelRoles instanceof Map || cfg.levelRoles) {
      const roleId = cfg.levelRoles instanceof Map
        ? cfg.levelRoles.get(String(user.level))
        : cfg.levelRoles?.[String(user.level)];

      if (roleId && message.member) {
        const role = message.guild.roles.cache.get(roleId);
        if (role) await message.member.roles.add(role);
      }
    }
  } catch (err) {
    logger.warn(`[LevelService] Level role failed: ${err.message}`);
  }
}

/**
 * Returns the leaderboard for a guild (top N users by level/XP).
 * @param {string} guildId
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function getLeaderboard(guildId, limit = 10) {
  return User.find({ guildId })
    .sort({ level: -1, xp: -1 })
    .limit(limit)
    .lean();
}

module.exports = { grantXP, xpForLevel, getLeaderboard };
