'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

/**
 * Checks if a GuildMember has a given permission flag.
 * @param {import('discord.js').GuildMember} member
 * @param {bigint} permission - PermissionFlagsBits value
 * @returns {boolean}
 */
function hasPermission(member, permission) {
  if (!member || !member.permissions) return false;
  return member.permissions.has(permission);
}

/**
 * Checks if a user ID matches the bot owner.
 * @param {string} userId
 * @returns {boolean}
 */
function isOwner(userId) {
  return userId === config.ownerId;
}

/**
 * Checks if a GuildMember has Administrator permission or is bot owner.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
  if (!member) return false;
  if (isOwner(member.user.id)) return true;
  return hasPermission(member, PermissionFlagsBits.Administrator);
}

/**
 * Checks if a GuildMember has Manage Guild permission or higher.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isManager(member) {
  if (!member) return false;
  if (isOwner(member.user.id)) return true;
  return (
    hasPermission(member, PermissionFlagsBits.ManageGuild) ||
    hasPermission(member, PermissionFlagsBits.Administrator)
  );
}

/**
 * Checks if a GuildMember has Manage Messages or higher.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isModerator(member) {
  if (!member) return false;
  if (isOwner(member.user.id)) return true;
  return (
    hasPermission(member, PermissionFlagsBits.ManageMessages) ||
    hasPermission(member, PermissionFlagsBits.KickMembers)    ||
    hasPermission(member, PermissionFlagsBits.BanMembers)     ||
    hasPermission(member, PermissionFlagsBits.Administrator)
  );
}

/**
 * Checks role hierarchy — returns true if executor is higher than target.
 * @param {import('discord.js').GuildMember} executor
 * @param {import('discord.js').GuildMember} target
 * @returns {boolean}
 */
function isHigherRole(executor, target) {
  if (!executor || !target) return false;
  return executor.roles.highest.position > target.roles.highest.position;
}

/**
 * Checks if the bot can act on a target member (hierarchy check).
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} target
 * @returns {boolean}
 */
function botCanActOn(guild, target) {
  const botMember = guild.members.me;
  if (!botMember) return false;
  if (target.user.id === guild.ownerId) return false;
  return botMember.roles.highest.position > target.roles.highest.position;
}

/**
 * Returns true if the interaction user can perform moderation on the target.
 * Checks: not self, not bot, not owner, hierarchy, and executor rank.
 *
 * @param {import('discord.js').GuildMember} executor
 * @param {import('discord.js').GuildMember} target
 * @param {import('discord.js').Guild} guild
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canModerate(executor, target, guild) {
  if (target.user.id === executor.user.id) {
    return { allowed: false, reason: 'You cannot moderate yourself.' };
  }
  if (target.user.bot) {
    return { allowed: false, reason: 'You cannot moderate a bot.' };
  }
  if (target.user.id === guild.ownerId) {
    return { allowed: false, reason: 'You cannot moderate the server owner.' };
  }
  if (!isHigherRole(executor, target)) {
    return { allowed: false, reason: 'Your role is not high enough to moderate that member.' };
  }
  if (!botCanActOn(guild, target)) {
    return { allowed: false, reason: "My role is not high enough to moderate that member." };
  }
  return { allowed: true };
}

module.exports = {
  hasPermission,
  isOwner,
  isAdmin,
  isManager,
  isModerator,
  isHigherRole,
  botCanActOn,
  canModerate,
};
