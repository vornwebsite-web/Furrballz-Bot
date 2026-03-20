'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { PermissionFlagsBits } = require('discord.js');
const AntiNuke   = require('../models/AntiNuke');
const logService = require('./logService');
const logger     = require('../utils/logger');
const config     = require('../config');

// In-memory rolling window: Map<guildId_userId_action, { count, windowStart }>
const actionWindows = new Map();

/**
 * Tracks an action by a user in a guild. If the threshold is exceeded,
 * executes the configured punishment.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} executorId  - The user who performed the action
 * @param {string} actionType  - 'channelCreate'|'channelDelete'|'roleCreate'|'roleDelete'|'ban'|'kick'|'webhookCreate'|'roleStrip'
 * @param {import('discord.js').Client} client
 */
async function track(guild, executorId, actionType, client) {
  if (!executorId) return;
  if (executorId === client.user.id) return;

  const cfg = await AntiNuke.getOrCreate(guild.id);
  if (!cfg.enabled) return;

  // Whitelisted users bypass antinuke
  if (cfg.whitelist.includes(executorId)) return;

  // Skip bots unless explicitly not whitelisted
  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  // Guild owner always bypass
  if (executorId === guild.ownerId) return;

  const threshold  = cfg.thresholds?.[actionType] ?? 5;
  const windowMs   = (cfg.windowSeconds ?? 10) * 1000;
  const key        = `${guild.id}_${executorId}_${actionType}`;
  const now        = Date.now();

  const entry = actionWindows.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > windowMs) {
    entry.count       = 1;
    entry.windowStart = now;
  } else {
    entry.count++;
  }

  actionWindows.set(key, entry);

  if (entry.count < threshold) return;

  // Reset window so we don't keep triggering
  actionWindows.delete(key);

  logger.warn(`[AntiNuke] Threshold breached — Guild: ${guild.id} | User: ${executorId} | Action: ${actionType} | Count: ${entry.count}`);

  // ── Execute punishment ────────────────────────────────────────────────────
  await executePunishment(guild, member, cfg.punishment, actionType, entry.count, client);

  // ── Log alert ─────────────────────────────────────────────────────────────
  if (cfg.logChannelId) {
    try {
      await logService.send(client, cfg.logChannelId, {
        type:  'antinuke',
        color: 'error',
        title: '☢️ Anti-Nuke Triggered',
        fields: [
          { name: 'User',       value: `<@${executorId}> (${member.user.tag})`, inline: true },
          { name: 'Action',     value: actionType, inline: true },
          { name: 'Count',      value: String(entry.count), inline: true },
          { name: 'Punishment', value: cfg.punishment, inline: true },
          { name: 'Threshold',  value: String(threshold), inline: true },
        ],
      });
    } catch { /* ignore */ }
  }

  // ── Persist to actionLog (cap at 50) ────────────────────────────────────
  try {
    cfg.actionLog.push({
      userId:      executorId,
      action:      actionType,
      count:       entry.count,
      punishment:  cfg.punishment,
      triggeredAt: new Date(),
    });
    if (cfg.actionLog.length > 50) cfg.actionLog.shift();
    await cfg.save();
  } catch { /* ignore */ }
}

/**
 * Executes a punishment on the offending member.
 */
async function executePunishment(guild, member, punishment, actionType, count, client) {
  try {
    switch (punishment) {
      case 'ban':
        if (member.bannable) {
          await member.ban({ reason: `[AntiNuke] ${actionType} threshold exceeded (${count} actions)` });
        }
        break;
      case 'kick':
        if (member.kickable) {
          await member.kick(`[AntiNuke] ${actionType} threshold exceeded (${count} actions)`);
        }
        break;
      case 'strip':
        if (member.manageable) {
          const rolesToRemove = member.roles.cache.filter(r =>
            r.id !== guild.id && guild.members.me.roles.highest.position > r.position
          );
          await member.roles.remove(rolesToRemove, `[AntiNuke] ${actionType} threshold exceeded`);
        }
        break;
      case 'deowner':
        // Remove Administrator and Manage Guild permissions by stripping dangerous roles
        if (member.manageable) {
          const dangerousRoles = member.roles.cache.filter(r =>
            r.permissions.has(PermissionFlagsBits.Administrator) ||
            r.permissions.has(PermissionFlagsBits.ManageGuild)
          );
          if (dangerousRoles.size > 0) {
            await member.roles.remove(dangerousRoles, `[AntiNuke] ${actionType} threshold exceeded`);
          }
        }
        break;
      case 'timeout':
        if (member.moderatable) {
          await member.timeout(24 * 60 * 60 * 1000, `[AntiNuke] ${actionType} threshold exceeded (${count} actions)`);
        }
        break;
    }
  } catch (err) {
    logger.error(`[AntiNuke] Punishment execution failed: ${err.message}`);
  }
}

module.exports = { track, executePunishment };
