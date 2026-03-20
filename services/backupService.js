'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { ChannelType } = require('discord.js');
const Backup = require('../models/Backup');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Creates a full backup snapshot of a guild.
 * @param {import('discord.js').Guild} guild
 * @param {string} createdBy - User ID who triggered the backup
 * @param {string} [label]   - Optional label for the backup
 * @returns {Promise<object>} Created backup document
 */
async function create(guild, createdBy, label) {
  // Enforce max backups per guild
  const count = await Backup.countDocuments({ guildId: guild.id });
  if (count >= config.limits.maxBackupsPerGuild) {
    // Delete oldest
    const oldest = await Backup.findOne({ guildId: guild.id }).sort({ createdAt: 1 });
    if (oldest) await oldest.deleteOne();
  }

  // ── Snapshot roles ────────────────────────────────────────────────────────
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map(r => ({
      id:          r.id,
      name:        r.name,
      color:       r.color,
      hoist:       r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position:    r.position,
      managed:     r.managed,
    }));

  // ── Snapshot channels ─────────────────────────────────────────────────────
  const channels = guild.channels.cache
    .filter(c => c.type !== ChannelType.GuildCategory || true) // include categories
    .sort((a, b) => a.position - b.position)
    .map(c => {
      const base = {
        id:       c.id,
        name:     c.name,
        type:     c.type,
        position: c.position,
        parentId: c.parentId || null,
        permissionOverwrites: c.permissionOverwrites?.cache.map(ow => ({
          id:    ow.id,
          type:  ow.type,
          allow: ow.allow.bitfield.toString(),
          deny:  ow.deny.bitfield.toString(),
        })) || [],
      };
      if ('topic'            in c) base.topic             = c.topic  || null;
      if ('nsfw'             in c) base.nsfw              = c.nsfw   || false;
      if ('rateLimitPerUser' in c) base.rateLimitPerUser  = c.rateLimitPerUser || 0;
      if ('bitrate'          in c) base.bitrate           = c.bitrate || null;
      if ('userLimit'        in c) base.userLimit         = c.userLimit || 0;
      return base;
    });

  // ── Guild settings ────────────────────────────────────────────────────────
  const settings = {
    name:                        guild.name,
    description:                 guild.description || null,
    iconURL:                     guild.iconURL({ size: 512, extension: 'png' }) || null,
    verificationLevel:           guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter:       guild.explicitContentFilter,
    afkChannelId:                guild.afkChannelId || null,
    afkTimeout:                  guild.afkTimeout,
    systemChannelId:             guild.systemChannelId || null,
  };

  const backup = await Backup.create({
    guildId: guild.id,
    createdBy,
    label:   label || null,
    roles,
    channels,
    settings,
  });

  logger.info(`[BackupService] Created backup ${backup.backupId} for guild ${guild.id}`);
  return backup;
}

/**
 * Restores a guild from a backup.
 * WARNING: This deletes existing roles and channels!
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} backupId
 * @param {object} [options]
 * @param {boolean} [options.deleteExisting=false] - Whether to delete current channels/roles first
 * @returns {Promise<{ success: boolean, errors: string[] }>}
 */
async function load(guild, backupId, options = {}) {
  const backup = await Backup.findOne({ backupId, guildId: guild.id });
  if (!backup) return { success: false, errors: ['Backup not found.'] };

  const errors = [];
  const { deleteExisting = false } = options;

  logger.info(`[BackupService] Loading backup ${backupId} into guild ${guild.id}`);

  // ── Delete existing channels if requested ─────────────────────────────────
  if (deleteExisting) {
    for (const [, channel] of guild.channels.cache) {
      await channel.delete('[BackupService] Restore').catch(e => errors.push(`Del channel: ${e.message}`));
      await sleep(300);
    }
  }

  // ── Delete existing roles if requested ────────────────────────────────────
  if (deleteExisting) {
    for (const [, role] of guild.roles.cache) {
      if (role.managed || role.id === guild.id) continue;
      await role.delete('[BackupService] Restore').catch(e => errors.push(`Del role: ${e.message}`));
      await sleep(300);
    }
  }

  // ── Restore roles (highest position first, skip @everyone) ───────────────
  const roleIdMap = new Map(); // old id → new id
  for (const snap of backup.roles) {
    try {
      const newRole = await guild.roles.create({
        name:        snap.name,
        color:       snap.color,
        hoist:       snap.hoist,
        mentionable: snap.mentionable,
        permissions: BigInt(snap.permissions),
        reason:      '[BackupService] Restore',
      });
      roleIdMap.set(snap.id, newRole.id);
      await sleep(300);
    } catch (e) {
      errors.push(`Role ${snap.name}: ${e.message}`);
    }
  }

  // ── Restore channels ──────────────────────────────────────────────────────
  const channelIdMap = new Map();
  // Categories first
  const categories = backup.channels.filter(c => c.type === ChannelType.GuildCategory);
  const rest       = backup.channels.filter(c => c.type !== ChannelType.GuildCategory);

  for (const snap of [...categories, ...rest]) {
    try {
      const overwrites = snap.permissionOverwrites.map(ow => ({
        id:    roleIdMap.get(ow.id) || ow.id,
        type:  ow.type,
        allow: BigInt(ow.allow),
        deny:  BigInt(ow.deny),
      }));

      const channelData = {
        name:                 snap.name,
        type:                 snap.type,
        permissionOverwrites: overwrites,
        reason:               '[BackupService] Restore',
      };

      if (snap.topic)            channelData.topic            = snap.topic;
      if (snap.nsfw)             channelData.nsfw             = snap.nsfw;
      if (snap.rateLimitPerUser) channelData.rateLimitPerUser = snap.rateLimitPerUser;
      if (snap.bitrate)          channelData.bitrate          = snap.bitrate;
      if (snap.userLimit)        channelData.userLimit        = snap.userLimit;

      // Resolve parent
      if (snap.parentId) {
        const newParentId = channelIdMap.get(snap.parentId);
        if (newParentId) channelData.parent = newParentId;
      }

      const newChannel = await guild.channels.create(channelData);
      channelIdMap.set(snap.id, newChannel.id);
      await sleep(300);
    } catch (e) {
      errors.push(`Channel ${snap.name}: ${e.message}`);
    }
  }

  logger.info(`[BackupService] Restore complete. Errors: ${errors.length}`);
  return { success: true, errors };
}

/**
 * Generates a diff summary between current guild state and a backup.
 */
async function preview(guild, backupId) {
  const backup = await Backup.findOne({ backupId, guildId: guild.id });
  if (!backup) return null;

  const currentRoles    = new Set(guild.roles.cache.map(r => r.name));
  const currentChannels = new Set(guild.channels.cache.map(c => c.name));
  const backupRoles     = new Set(backup.roles.map(r => r.name));
  const backupChannels  = new Set(backup.channels.map(c => c.name));

  return {
    rolesToAdd:      [...backupRoles].filter(r => !currentRoles.has(r)),
    rolesToRemove:   [...currentRoles].filter(r => !backupRoles.has(r)),
    channelsToAdd:   [...backupChannels].filter(c => !currentChannels.has(c)),
    channelsToRemove:[...currentChannels].filter(c => !backupChannels.has(c)),
    backupDate:      backup.createdAt,
    label:           backup.label,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { create, load, preview };
