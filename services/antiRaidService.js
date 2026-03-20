'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const Guild      = require('../models/Guild');
const logService = require('./logService');
const logger     = require('../utils/logger');

// In-memory join tracker: Map<guildId, { joins: number[], lockdownActive: boolean }>
const joinTracker = new Map();

/**
 * Tracks a member join for antiraid purposes.
 * Returns true if a lockdown was triggered.
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildDoc
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function track(member, guildDoc, client) {
  // Read antiraid config from Guild doc — stored in the same guildDoc for simplicity
  // Full antiraid config is managed via /antiraid command and stored in guild.antiraid sub-doc
  // For now we read from a reasonable default if not configured
  const cfg = guildDoc.antiraid || {};
  if (!cfg.enabled) return false;

  const threshold   = cfg.threshold   ?? 10;
  const windowMs    = cfg.windowMs    ?? (config?.intervals?.antiRaidWindow ?? 10000);
  const action      = cfg.action      ?? 'lockdown';
  const guildId     = member.guild.id;
  const now         = Date.now();

  if (!joinTracker.has(guildId)) {
    joinTracker.set(guildId, { joins: [], lockdownActive: false });
  }

  const entry = joinTracker.get(guildId);

  if (entry.lockdownActive) return true;

  // Add this join timestamp, prune old ones outside the window
  entry.joins.push(now);
  entry.joins = entry.joins.filter(t => now - t < windowMs);

  if (entry.joins.length < threshold) return false;

  // ── Threshold exceeded — trigger lockdown ────────────────────────────────
  entry.lockdownActive = true;
  logger.warn(`[AntiRaid] Raid detected in guild ${guildId} — ${entry.joins.length} joins in ${windowMs}ms`);

  if (action === 'lockdown') {
    await lockdownGuild(member.guild, client);
  }

  // Alert mods
  if (cfg.alertChannelId) {
    await logService.send(client, cfg.alertChannelId, {
      type:  'antiraid',
      color: 'error',
      title: '🚨 Raid Detected — Lockdown Active',
      fields: [
        { name: 'Joins in window', value: String(entry.joins.length), inline: true },
        { name: 'Window',          value: `${windowMs / 1000}s`, inline: true },
        { name: 'Action taken',    value: action, inline: true },
        { name: 'Restore',         value: 'Use `/antiraid lockdown disable` to restore.', inline: false },
      ],
    });
  }

  // Auto-restore after 10 minutes
  setTimeout(async () => {
    try {
      await restoreGuild(member.guild, client);
      entry.lockdownActive = false;
      entry.joins          = [];
      logger.info(`[AntiRaid] Auto-restored guild ${guildId} after lockdown`);
    } catch (err) {
      logger.error(`[AntiRaid] Auto-restore failed: ${err.message}`);
    }
  }, 10 * 60 * 1000);

  return true;
}

/**
 * Locks all text channels for @everyone.
 */
async function lockdownGuild(guild, client) {
  try {
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText && c.manageable
    );
    for (const [, channel] of channels) {
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: false,
      }, { reason: '[AntiRaid] Raid lockdown' }).catch(() => {});
    }
    logger.info(`[AntiRaid] Locked ${channels.size} channels in guild ${guild.id}`);
  } catch (err) {
    logger.error(`[AntiRaid] Lockdown failed: ${err.message}`);
  }
}

/**
 * Restores locked channels.
 */
async function restoreGuild(guild, client) {
  try {
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText && c.manageable
    );
    for (const [, channel] of channels) {
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: null, // Reset to inherit
      }, { reason: '[AntiRaid] Lockdown lifted' }).catch(() => {});
    }
    logger.info(`[AntiRaid] Restored ${channels.size} channels in guild ${guild.id}`);
  } catch (err) {
    logger.error(`[AntiRaid] Restore failed: ${err.message}`);
  }
}

/**
 * Manually triggers or lifts a lockdown.
 */
async function setLockdown(guild, active, client) {
  if (active) {
    await lockdownGuild(guild, client);
    const entry = joinTracker.get(guild.id) || { joins: [], lockdownActive: false };
    entry.lockdownActive = true;
    joinTracker.set(guild.id, entry);
  } else {
    await restoreGuild(guild, client);
    const entry = joinTracker.get(guild.id);
    if (entry) { entry.lockdownActive = false; entry.joins = []; }
  }
}

module.exports = { track, lockdownGuild, restoreGuild, setLockdown };
