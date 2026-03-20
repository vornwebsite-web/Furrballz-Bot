'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { PermissionFlagsBits } = require('discord.js');
const logger     = require('../utils/logger');
const logService = require('./logService');
const Warn       = require('../models/Warn');
const constants  = require('../utils/constants');

// In-memory spam tracker: Map<guildId_userId, { count, resetAt }>
const spamTracker = new Map();

/**
 * Runs automod checks on a message. Returns true if message was deleted.
 * @param {import('discord.js').Message} message
 * @param {object} guildDoc
 * @returns {Promise<boolean>}
 */
async function check(message, guildDoc) {
  const cfg = guildDoc.automod;
  if (!cfg?.enabled) return false;

  // Skip if user has a whitelisted role or is in whitelisted channel
  if (cfg.whitelist?.channels?.includes(message.channel.id)) return false;
  if (message.member?.roles?.cache?.some(r => cfg.whitelist?.roles?.includes(r.id))) return false;

  // Skip admins
  if (message.member?.permissions?.has(PermissionFlagsBits.Administrator)) return false;

  let violated = false;
  let reason   = '';

  // ── Banned words ──────────────────────────────────────────────────────────
  if (cfg.bannedWords?.length > 0) {
    const lower = message.content.toLowerCase();
    const found = cfg.bannedWords.find(w => lower.includes(w.toLowerCase()));
    if (found) { violated = true; reason = `Banned word: ${found}`; }
  }

  // ── Invite filter ─────────────────────────────────────────────────────────
  if (!violated && cfg.filterInvites) {
    if (constants.REGEX.INVITE_LINK.test(message.content)) {
      violated = true;
      reason   = 'Discord invite link';
      constants.REGEX.INVITE_LINK.lastIndex = 0;
    }
  }

  // ── Link filter ───────────────────────────────────────────────────────────
  if (!violated && cfg.filterLinks) {
    if (constants.REGEX.URL.test(message.content)) {
      violated = true;
      reason   = 'External link';
      constants.REGEX.URL.lastIndex = 0;
    }
  }

  // ── Caps filter ───────────────────────────────────────────────────────────
  if (!violated && cfg.filterCaps && message.content.length > 10) {
    const upper   = message.content.replace(/[^a-zA-Z]/g, '');
    const capsPct = upper.length > 0
      ? (message.content.replace(/[^A-Z]/g, '').length / upper.length) * 100
      : 0;
    if (capsPct >= (cfg.capsThreshold ?? 70)) {
      violated = true;
      reason   = `Excessive caps (${Math.round(capsPct)}%)`;
    }
  }

  // ── Mention spam ─────────────────────────────────────────────────────────
  if (!violated && cfg.filterMentions) {
    const mentionCount = (message.mentions.users.size + message.mentions.roles.size);
    if (mentionCount >= (cfg.mentionLimit ?? 5)) {
      violated = true;
      reason   = `Mass mentions (${mentionCount})`;
    }
  }

  if (!violated) return false;

  // ── Delete the message ────────────────────────────────────────────────────
  try {
    await message.delete();
  } catch { /* already deleted or no perms */ }

  // ── Execute configured action ─────────────────────────────────────────────
  await executeAction(message, guildDoc, cfg.action || 'delete', reason);

  // ── Log the automod action ────────────────────────────────────────────────
  if (cfg.logChannelId) {
    try {
      await logService.send(message.client, cfg.logChannelId, {
        type:  'automod',
        color: 'warning',
        title: 'Automod Action',
        fields: [
          { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Reason',  value: reason, inline: true },
          { name: 'Action',  value: cfg.action || 'delete', inline: true },
          { name: 'Content', value: message.content?.slice(0, 512) || '*empty*', inline: false },
        ],
      });
    } catch { /* ignore */ }
  }

  return true;
}

/**
 * Executes an automod action on the message author.
 */
async function executeAction(message, guildDoc, action, reason) {
  const member = message.member;
  if (!member) return;

  try {
    switch (action) {
      case 'warn': {
        await Warn.create({
          userId:      message.author.id,
          guildId:     message.guild.id,
          moderatorId: message.client.user.id,
          reason:      `[Automod] ${reason}`,
        });
        await message.channel.send({
          content: `<@${message.author.id}>, you have been warned: **${reason}**`,
          allowedMentions: { users: [message.author.id] },
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        break;
      }
      case 'mute': {
        if (member.moderatable) {
          await member.timeout(5 * 60 * 1000, `[Automod] ${reason}`);
        }
        break;
      }
      case 'kick': {
        if (member.kickable) {
          await member.kick(`[Automod] ${reason}`);
        }
        break;
      }
      case 'delete':
      default:
        // Message already deleted above
        break;
    }
  } catch (err) {
    logger.warn(`[AutomodService] Action ${action} failed: ${err.message}`);
  }
}

/**
 * Checks message rate for antispam. Returns true if action was taken.
 * @param {import('discord.js').Message} message
 * @param {object} guildDoc
 */
async function checkSpam(message, guildDoc) {
  const cfg = guildDoc.antispam;
  if (!cfg?.enabled) return false;

  if (cfg.whitelist?.channels?.includes(message.channel.id)) return false;
  if (message.member?.roles?.cache?.some(r => cfg.whitelist?.roles?.includes(r.id))) return false;
  if (message.member?.permissions?.has(PermissionFlagsBits.Administrator)) return false;

  const key      = `${message.guild.id}_${message.author.id}`;
  const now      = Date.now();
  const interval = cfg.interval ?? 5000;
  const threshold = cfg.threshold ?? 5;

  const entry = spamTracker.get(key) || { count: 0, resetAt: now + interval };

  if (now > entry.resetAt) {
    entry.count   = 1;
    entry.resetAt = now + interval;
  } else {
    entry.count++;
  }

  spamTracker.set(key, entry);

  // Clean up old entries every 100 checks
  if (Math.random() < 0.01) {
    for (const [k, v] of spamTracker) {
      if (Date.now() > v.resetAt) spamTracker.delete(k);
    }
  }

  if (entry.count < threshold) return false;

  // Reset count so we don't keep triggering
  entry.count = 0;
  spamTracker.set(key, entry);

  await executeAction(message, guildDoc, cfg.action || 'mute', 'Message spam');
  return true;
}

module.exports = { check, checkSpam, executeAction };
