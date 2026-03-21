'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logger          = require('../utils/logger');
const Guild           = require('../models/Guild');
const logService      = require('../services/logService');
const welcomeService  = require('../services/welcomeService');
const antiRaidService = require('../services/antiRaidService');
const inviteTrackerService = require('../services/inviteTrackerService');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member, client) {
    const guild = await Guild.getOrCreate(member.guild.id);

    // ── Anti-raid check ───────────────────────────────────────────────────────
    try {
      const triggered = await antiRaidService.track(member, guild, client);
      if (triggered) return; // Lockdown triggered — skip rest of join handling
    } catch (err) {
      logger.error(`[GuildMemberAdd] AntiRaid error: ${err.message}`);
    }

    // ── Determine which invite was used ───────────────────────────────────────
    let usedInvite = { code: null, inviterId: null, type: 'unknown' };
    try {
      usedInvite = await inviteTrackerService.resolveInvite(member.guild, member);
    } catch (err) {
      logger.warn(`[GuildMemberAdd] Invite tracker error: ${err.message}`);
    }

    // ── Alt / new account protection ─────────────────────────────────────────
    if (guild.altProtection?.enabled) {
      try {
        const cfg         = guild.altProtection;
        const accountAge  = Date.now() - member.user.createdTimestamp;
        const minAgeMs    = (cfg.minAccountAgeDays || 7) * 24 * 60 * 60 * 1000;
        const isNewAcct   = accountAge < minAgeMs;
        const hasNoAvatar = cfg.blockDefaultAvatar && !member.user.avatar;

        // Check if the inviter is exempt
        const inviterExempt = usedInvite.inviterId && cfg.ignoreInviterId?.includes(usedInvite.inviterId);

        if ((isNewAcct || hasNoAvatar) && !inviterExempt) {
          const { buildEmbed } = require('../utils/embedBuilder');
          const reasons = [];
          if (isNewAcct)   reasons.push(`Account age: **${Math.floor(accountAge / (24*60*60*1000))} days** (minimum: ${cfg.minAccountAgeDays})`);
          if (hasNoAvatar) reasons.push('No profile avatar (default avatar)');

          // Always alert mods if alert channel set
          if (cfg.alertChannelId) {
            const alertCh = member.guild.channels.cache.get(cfg.alertChannelId);
            if (alertCh) {
              const alertEmbed = buildEmbed({
                type:        'warning',
                title:       '🛡️ Potential Alt Account Detected',
                description: `<@${member.id}> (**${member.user.tag}**) joined and may be an alt account.`,
                thumbnail:   member.user.displayAvatarURL({ size: 128 }),
                fields: [
                  { name: '⚠️ Reasons',    value: reasons.join('\n'),                                          inline: false },
                  { name: '📅 Created',    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true  },
                  { name: '🔗 Invite',     value: usedInvite.code ? `\`${usedInvite.code}\`` : 'Unknown',      inline: true  },
                  { name: '📨 Inviter',    value: usedInvite.inviterId ? `<@${usedInvite.inviterId}>` : 'Unknown', inline: true },
                  { name: '⚙️ Action',     value: cfg.action === 'alert' ? 'Alert only (no action taken)' : cfg.action === 'kick' ? 'Kicked from server' : 'Banned from server', inline: true },
                ],
              });
              await alertCh.send({ embeds: [alertEmbed] });
            }
          }

          // Take action
          if (cfg.action === 'kick') {
            await member.kick(`[Alt Protection] Account too new or no avatar. Age: ${Math.floor(accountAge / (24*60*60*1000))}d`).catch(() => {});
            logger.info(`[AltProtection] Kicked ${member.user.tag} (${member.id}) — ${reasons.join(', ')}`);
            return; // Don't send welcome or do anything else
          } else if (cfg.action === 'ban') {
            await member.ban({ reason: `[Alt Protection] Account too new or no avatar. Age: ${Math.floor(accountAge / (24*60*60*1000))}d` }).catch(() => {});
            logger.info(`[AltProtection] Banned ${member.user.tag} (${member.id}) — ${reasons.join(', ')}`);
            return;
          }
          // If action is 'alert', fall through — just alerted, no kick/ban
        }
      } catch (err) {
        logger.error(`[GuildMemberAdd] Alt protection error: ${err.message}`);
      }
    }

    // ── Post to invite log channel if configured ──────────────────────────────
    if (guild.inviteLogChannelId) {
      try {
        await inviteTrackerService.postInviteLog(client, member, usedInvite, guild.inviteLogChannelId);
      } catch (err) {
        logger.warn(`[GuildMemberAdd] Invite log error: ${err.message}`);
      }
    }

    // ── Welcome message ───────────────────────────────────────────────────────
    if (guild.welcome?.enabled) {
      try {
        await welcomeService.send(member, guild, client);
      } catch (err) {
        logger.error(`[GuildMemberAdd] Welcome error: ${err.message}`);
      }
    }

    // ── Auto roles ────────────────────────────────────────────────────────────
    if (guild.autoRoles?.length > 0) {
      try {
        const rolesToAdd = guild.autoRoles
          .map(id => member.guild.roles.cache.get(id))
          .filter(Boolean);
        if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd);
      } catch (err) {
        logger.warn(`[GuildMemberAdd] Auto-role error: ${err.message}`);
      }
    }

    // ── Verify gate — if enabled, don't assign roles until verified ───────────
    // (Verify role is assigned via the verify button handler in interactionCreate)

    // ── Log member join ───────────────────────────────────────────────────────
    try {
      if (!guild.logChannels?.memberJoin) return;

      const accountAge = Date.now() - member.user.createdTimestamp;
      const newAccount = accountAge < 7 * 24 * 60 * 60 * 1000; // < 7 days

      await logService.send(client, guild.logChannels.memberJoin, {
        type:  'memberJoin',
        color: 'success',
        title: 'Member Joined',
        thumbnail: member.user.displayAvatarURL(),
        fields: [
          { name: 'User',        value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count',value: `${member.guild.memberCount}`, inline: true },
          ...(usedInvite.code ? [{ name: 'Used Invite', value: `\`${usedInvite.code}\`${usedInvite.inviterId ? ` by <@${usedInvite.inviterId}>` : ''}`, inline: true }] : []),
          ...(usedInvite.type === 'oauth' ? [{ name: '🤖 Join Type', value: 'OAuth / App Directory', inline: true }] : []),
          ...(usedInvite.type === 'vanity' ? [{ name: '🔗 Join Type', value: `Vanity URL \`/${usedInvite.code}\``, inline: true }] : []),
          ...(newAccount ? [{ name: '⚠️ New Account', value: 'This account was created less than 7 days ago.', inline: false }] : []),
        ],
      });
    } catch { /* ignore */ }
  },
};
