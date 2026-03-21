'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logger           = require('../utils/logger');
const logService       = require('../services/logService');
const antiNukeService  = require('../services/antiNukeService');
const Guild            = require('../models/Guild');

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember, client) {
    const guild = await Guild.getOrCreate(newMember.guild.id);

    // ── Boost detection ───────────────────────────────────────────────────────
    // SECURITY: Only fire when premiumSince transitions from null → a real date.
    // Guards against:
    //   • Nickname / avatar / username / role changes   → premiumSince unchanged
    //   • Discord double-fire on same boost event       → in-memory cooldown per user
    //   • Member re-boosting within same session        → timestamp must differ
    const wasBoostTimestamp = oldMember.premiumSinceTimestamp; // null if not boosting
    const isBoostTimestamp  = newMember.premiumSinceTimestamp; // null if not boosting

    const justStartedBoosting = !wasBoostTimestamp && !!isBoostTimestamp;
    const justStoppedBoosting = !!wasBoostTimestamp && !isBoostTimestamp;

    // In-memory dedup: prevent double announce within 5 seconds per user
    if (!client._boostCooldown) client._boostCooldown = new Map();
    const boostKey   = `${newMember.guild.id}_${newMember.id}`;
    const lastBoost  = client._boostCooldown.get(boostKey) || 0;
    const boostDedup = justStartedBoosting && (Date.now() - lastBoost) > 5000;

    if (justStartedBoosting && boostDedup) {
      client._boostCooldown.set(boostKey, Date.now());
      // Clean up old entries every 100 boosts to avoid memory leak
      if (client._boostCooldown.size > 100) {
        const cutoff = Date.now() - 60000;
        for (const [k, v] of client._boostCooldown) {
          if (v < cutoff) client._boostCooldown.delete(k);
        }
      }
      // Assign boost role if configured
      if (guild.boostRoleId) {
        try {
          const boostRole = newMember.guild.roles.cache.get(guild.boostRoleId);
          if (boostRole && !newMember.roles.cache.has(boostRole.id)) {
            await newMember.roles.add(boostRole, 'Server boost reward');
          }
        } catch (err) {
          logger.warn(`[GuildMemberUpdate] Boost role assign error: ${err.message}`);
        }
      }

      // Send boost announcement if channel configured
      if (guild.boostChannelId) {
        try {
          const channel = newMember.guild.channels.cache.get(guild.boostChannelId);
          if (channel) {
            const { buildEmbed } = require('../utils/embedBuilder');
            const boostCount = newMember.guild.premiumSubscriptionCount;
            const boostTier  = newMember.guild.premiumTier;

            const embed = buildEmbed({
              type:        'boost',
              title:       '💎 New Server Boost!',
              description: guild.boostMessage
                ? guild.boostMessage
                    .replace('{user}',     `<@${newMember.id}>`)
                    .replace('{username}', newMember.user.username)
                    .replace('{server}',   newMember.guild.name)
                    .replace('{count}',    String(boostCount))
                : `<@${newMember.id}> just boosted **${newMember.guild.name}**! 💖\nWe now have **${boostCount}** boost${boostCount !== 1 ? 's' : ''}!`,
              thumbnail: newMember.user.displayAvatarURL({ size: 256 }),
              fields: [
                { name: '💎 Booster',    value: `<@${newMember.id}>`, inline: true },
                { name: '🔢 Boosts',     value: `${boostCount}`,      inline: true },
                { name: '🏅 Tier',       value: `Tier ${boostTier}`,  inline: true },
                ...(guild.boostRoleId ? [{ name: '🎁 Reward', value: `<@&${guild.boostRoleId}>`, inline: true }] : []),
              ],
            });

            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          logger.warn(`[GuildMemberUpdate] Boost announce error: ${err.message}`);
        }
      }
    } // end justStartedBoosting && boostDedup
    if (justStoppedBoosting && guild.boostRoleId) {
      try {
        const boostRole = newMember.guild.roles.cache.get(guild.boostRoleId);
        if (boostRole && newMember.roles.cache.has(boostRole.id)) {
          await newMember.roles.remove(boostRole, 'No longer boosting');
        }
      } catch (err) {
        logger.warn(`[GuildMemberUpdate] Boost role remove error: ${err.message}`);
      }
    }

    // ── Anti-nuke — mass role strip detection ─────────────────────────────────
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (removedRoles.size >= 3) {
      try {
        // Fetch executor from audit log
        const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null);
        const entry = logs?.entries.first();
        if (entry && entry.target?.id === newMember.id) {
          await antiNukeService.track(newMember.guild, entry.executor?.id, 'roleStrip', client);
        }
      } catch { /* ignore */ }
    }

    // ── Log role changes ──────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.memberUpdate) return;

      const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const nicknameChanged = oldMember.nickname !== newMember.nickname;

      if (addedRoles.size === 0 && removedRoles.size === 0 && !nicknameChanged) return;

      const fields = [];
      if (addedRoles.size > 0)   fields.push({ name: 'Roles Added',   value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
      if (removedRoles.size > 0) fields.push({ name: 'Roles Removed', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false });
      if (nicknameChanged)       fields.push({ name: 'Nickname', value: `${oldMember.nickname || 'None'} → ${newMember.nickname || 'None'}`, inline: false });

      await logService.send(client, guild.logChannels.memberUpdate, {
        type:   'memberUpdate',
        color:  'info',
        title:  'Member Updated',
        fields: [
          { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
          ...fields,
        ],
      });
    } catch { /* ignore */ }
  },
};
