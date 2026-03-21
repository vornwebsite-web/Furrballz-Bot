'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const InviteCache = require('../models/InviteCache');
const logger      = require('../utils/logger');

/**
 * Syncs all guild invites into the DB cache.
 */
async function syncInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const ops     = invites.map(invite => ({
      updateOne: {
        filter: { inviteCode: invite.code, guildId: guild.id },
        update: {
          $set: {
            guildId:    guild.id,
            inviteCode: invite.code,
            inviterId:  invite.inviter?.id || null,
            uses:       invite.uses || 0,
            maxUses:    invite.maxUses || 0,
            expiresAt:  invite.expiresAt || null,
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
 * Returns { code, inviterId, type } where type is:
 *   'invite'  — normal invite link
 *   'vanity'  — vanity URL
 *   'oauth'   — bot OAuth / application directory join (no invite link)
 *   'unknown' — could not determine
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<{ code: string|null, inviterId: string|null, type: string }>}
 */
async function resolveInvite(guild, member) {
  try {
    const [currentInvites, cachedInvites] = await Promise.all([
      guild.invites.fetch().catch(() => null),
      InviteCache.find({ guildId: guild.id }),
    ]);

    // If we can't fetch invites (missing permission), check for OAuth
    if (!currentInvites) {
      return { code: null, inviterId: null, type: 'unknown' };
    }

    const cachedMap = new Map(cachedInvites.map(i => [i.inviteCode, i.uses]));

    // Diff use counts to find which invite was used
    for (const [, invite] of currentInvites) {
      const cachedUses = cachedMap.get(invite.code) ?? 0;
      if (invite.uses > cachedUses) {
        await InviteCache.updateOne(
          { inviteCode: invite.code, guildId: guild.id },
          { $set: { uses: invite.uses } },
        );
        return {
          code:      invite.code,
          inviterId: invite.inviter?.id || null,
          type:      'invite',
        };
      }
    }

    // Check vanity URL
    if (guild.vanityURLCode) {
      try {
        const vanity = await guild.fetchVanityData();
        const cached = await InviteCache.findOne({ inviteCode: guild.vanityURLCode, guildId: guild.id });
        if (vanity && (!cached || vanity.uses > cached.uses)) {
          await InviteCache.findOneAndUpdate(
            { inviteCode: guild.vanityURLCode, guildId: guild.id },
            { $set: { uses: vanity.uses, inviterId: null } },
            { upsert: true },
          );
          return { code: guild.vanityURLCode, inviterId: null, type: 'vanity' };
        }
      } catch { /* no vanity perms */ }
    }

    // If invite count matches but no invite changed → likely OAuth join
    // OAuth: member joined via bot authorization or application directory
    // We detect this by checking if the total use count of all invites is unchanged
    const totalCurrentUses  = [...currentInvites.values()].reduce((a, i) => a + (i.uses || 0), 0);
    const totalCachedUses   = cachedInvites.reduce((a, i) => a + (i.uses || 0), 0);

    if (totalCurrentUses === totalCachedUses || currentInvites.size === 0) {
      // No invite usage change detected — OAuth or unknown join
      return { code: null, inviterId: null, type: 'oauth' };
    }

    return { code: null, inviterId: null, type: 'unknown' };
  } catch (err) {
    logger.warn(`[InviteTracker] Resolve failed: ${err.message}`);
    return { code: null, inviterId: null, type: 'unknown' };
  }
}

/**
 * Posts an invite join notification to the configured invite log channel.
 * Format mirrors Useless Tracker: "User joined using invite / invited by X who now has N invites"
 */
async function postInviteLog(client, member, invite, channelId) {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const { buildEmbed } = require('../utils/embedBuilder');

    // Get inviter's total invite uses across this guild
    let inviterTotal = null;
    if (invite.inviterId) {
      const allInviterInvites = await InviteCache.find({ guildId: member.guild.id, inviterId: invite.inviterId });
      inviterTotal = allInviterInvites.reduce((sum, i) => sum + (i.uses || 0), 0);
    }

    // Build the main description line — mirrors the screenshot format
    let description;
    if (invite.type === 'invite' && invite.inviterId) {
      description = `<@${member.id}> has been invited by <@${invite.inviterId}> and has now **${inviterTotal}** invite${inviterTotal === 1 ? '' : 's'}.`;
    } else if (invite.type === 'vanity') {
      description = `<@${member.id}> joined using the server's vanity URL \`/${invite.code}\`.`;
    } else if (invite.type === 'oauth') {
      description = `<@${member.id}> joined using OAuth (bot authorization or app directory).`;
    } else {
      description = `<@${member.id}> joined — invite could not be determined.`;
    }

    const accountAge      = Date.now() - member.user.createdTimestamp;
    const isNewAccount    = accountAge < 7 * 24 * 60 * 60 * 1000;

    const fields = [
      { name: '👤 User',         value: `${member.user.tag} \`${member.id}\``,                         inline: true },
      { name: '📅 Account Age',  value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,     inline: true },
      { name: '👥 Members',      value: `${member.guild.memberCount}`,                                  inline: true },
    ];

    if (invite.inviterId) {
      fields.push({ name: '📨 Invited by', value: `<@${invite.inviterId}>`,    inline: true });
      fields.push({ name: '🔗 Invite',     value: `\`${invite.code}\``,        inline: true });
      fields.push({ name: '📊 Inviter total', value: `**${inviterTotal}** invite${inviterTotal === 1 ? '' : 's'}`, inline: true });
    } else if (invite.type === 'vanity') {
      fields.push({ name: '🔗 Join method', value: `Vanity URL \`/${invite.code}\``, inline: true });
    } else if (invite.type === 'oauth') {
      fields.push({ name: '🔗 Join method', value: 'OAuth / App Directory', inline: true });
    }

    if (isNewAccount) {
      fields.push({ name: '⚠️ New Account', value: 'Created less than 7 days ago.', inline: false });
    }

    const embed = buildEmbed({
      type:        'info',
      title:       'Member Joined',
      description,
      thumbnail:   member.user.displayAvatarURL({ size: 128 }),
      fields,
    });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn(`[InviteTracker] postInviteLog failed: ${err.message}`);
  }
}

/**
 * Gets the invite leaderboard for a guild.
 */
async function getLeaderboard(guildId, limit = 10) {
  return InviteCache.find({ guildId }).sort({ uses: -1 }).limit(limit).lean();
}

module.exports = { syncInvites, resolveInvite, postInviteLog, getLeaderboard };
