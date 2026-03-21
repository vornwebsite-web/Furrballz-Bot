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
    let usedInvite = null;
    try {
      usedInvite = await inviteTrackerService.resolveInvite(member.guild, client);
    } catch (err) {
      logger.warn(`[GuildMemberAdd] Invite tracker error: ${err.message}`);
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
          ...(usedInvite ? [{ name: 'Used Invite', value: `\`${usedInvite.code}\` by <@${usedInvite.inviterId}>`, inline: true }] : []),
          ...(newAccount ? [{ name: '⚠️ New Account', value: 'This account was created less than 7 days ago.', inline: false }] : []),
        ],
      });
    } catch { /* ignore */ }
  },
};
