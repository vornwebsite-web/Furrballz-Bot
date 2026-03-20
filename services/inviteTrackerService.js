'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const InviteCache = require('../models/InviteCache');
const logger      = require('../utils/logger');

/**
 * Syncs all guild invites into the DB cache.
 * Call this on ready and whenever a new invite is created.
 * @param {import('discord.js').Guild} guild
 */
async function syncInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const ops     = invites.map(invite => ({
      updateOne: {
        filter: { inviteCode: invite.code },
        update: {
          $set: {
            guildId:   guild.id,
            inviteCode: invite.code,
            inviterId: invite.inviter?.id || null,
            uses:      invite.uses || 0,
            maxUses:   invite.maxUses || 0,
            expiresAt: invite.expiresAt || null,
          },
        },
        upsert: true,
      },
    }));
    if (ops.length > 0) await InviteCache.bulkWrite(ops);
  } catch (err) {
    logger.warn(`[InviteTracker] Sync failed for ${guild.id}: ${err.message}`);
  }
}

/**
 * Resolves which invite was used when a member joins.
 * Diffs the current invite use counts against the DB cache.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ code: string, inviterId: string } | null>}
 */
async function resolveInvite(guild, client) {
  try {
    const [currentInvites, cachedInvites] = await Promise.all([
      guild.invites.fetch(),
      InviteCache.find({ guildId: guild.id }),
    ]);

    const cachedMap = new Map(cachedInvites.map(i => [i.inviteCode, i.uses]));

    // Find the invite whose use count increased
    for (const [, invite] of currentInvites) {
      const cachedUses = cachedMap.get(invite.code) ?? 0;
      if (invite.uses > cachedUses) {
        // Update cache
        await InviteCache.updateOne(
          { inviteCode: invite.code },
          { $set: { uses: invite.uses } },
        );
        return {
          code:      invite.code,
          inviterId: invite.inviter?.id || null,
        };
      }
    }

    // Check vanity URL
    if (guild.vanityURLCode) {
      const vanity  = await guild.fetchVanityData().catch(() => null);
      const cached  = await InviteCache.findOne({ inviteCode: guild.vanityURLCode, guildId: guild.id });
      if (vanity && cached && vanity.uses > cached.uses) {
        await InviteCache.updateOne({ inviteCode: guild.vanityURLCode }, { $set: { uses: vanity.uses } });
        return { code: guild.vanityURLCode, inviterId: null };
      }
    }

    return null;
  } catch (err) {
    logger.warn(`[InviteTracker] Resolve failed: ${err.message}`);
    return null;
  }
}

/**
 * Gets the invite leaderboard for a guild.
 * @param {string} guildId
 * @param {number} [limit=10]
 */
async function getLeaderboard(guildId, limit = 10) {
  const invites = await InviteCache.find({ guildId }).sort({ uses: -1 }).limit(limit).lean();
  return invites;
}

module.exports = { syncInvites, resolveInvite, getLeaderboard };
