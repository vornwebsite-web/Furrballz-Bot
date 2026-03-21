'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { buildEmbed } = require('../utils/embedBuilder');
const logger         = require('../utils/logger');

/**
 * Resolves template variables in a welcome message string.
 * @param {string} template
 * @param {import('discord.js').GuildMember} member
 * @returns {string}
 */
function resolveTemplate(template, member) {
  return template
    .replace(/{user}/g,        `<@${member.id}>`)
    .replace(/{username}/g,    member.user.username)
    .replace(/{tag}/g,         member.user.tag)
    .replace(/{server}/g,      member.guild.name)
    .replace(/{count}/g,       String(member.guild.memberCount))
    .replace(/{memberCount}/g, String(member.guild.memberCount))
    .replace(/{id}/g,          member.id);
}

/**
 * Sends the welcome message for a new guild member.
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildDoc - Mongoose Guild document
 * @param {import('discord.js').Client} client
 */
async function send(member, guildDoc, client) {
  const cfg = guildDoc.welcome;
  if (!cfg?.enabled) return;

  // ── Welcome channel message ───────────────────────────────────────────────
  if (cfg.channelId) {
    try {
      const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (channel?.isTextBased()) {
        const content = resolveTemplate(cfg.message || 'Welcome {user} to **{server}**!', member);
        const embed   = buildEmbed({
          type:        'primary',
          description: content,
          thumbnail:   member.user.displayAvatarURL({ size: 256 }),
          color:       cfg.embedColor || 0x7F77DD,
        });
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn(`[WelcomeService] Channel send failed: ${err.message}`);
    }
  }

  // ── Welcome DM ────────────────────────────────────────────────────────────
  if (cfg.dmMessage) {
    try {
      const dmContent = resolveTemplate(cfg.dmMessage, member);
      await member.send({ content: dmContent }).catch(() => {});
    } catch { /* user may have DMs off */ }
  }

  // ── Auto role ─────────────────────────────────────────────────────────────
  if (cfg.roleId) {
    try {
      const role = member.guild.roles.cache.get(cfg.roleId);
      if (role) await member.roles.add(role);
    } catch (err) {
      logger.warn(`[WelcomeService] Auto-role failed: ${err.message}`);
    }
  }
}

module.exports = { send, resolveTemplate };
