'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const User       = require('../models/User');
const Guild      = require('../models/Guild');
const { buildEmbed } = require('../utils/embedBuilder');
const logger     = require('../utils/logger');
const config     = require('../config');

/**
 * Starts the birthday check interval — runs every hour.
 * @param {import('discord.js').Client} client
 */
function start(client) {
  setInterval(() => checkBirthdays(client), config.intervals.birthdayCheck);
  // Also run once on startup to catch any missed birthdays
  setTimeout(() => checkBirthdays(client), 5000);
  logger.info('[BirthdayService] Started');
}

/**
 * Checks all guilds for users whose birthday is today.
 */
async function checkBirthdays(client) {
  const now   = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(now.getUTCDate()).padStart(2, '0');
  const today = `${month}-${day}`;

  try {
    const guilds = await Guild.find({
      'birthdayChannelId': { $ne: null },
    });

    for (const guildDoc of guilds) {
      try {
        await processGuildBirthdays(guildDoc, today, client);
      } catch (err) {
        logger.warn(`[BirthdayService] Guild ${guildDoc.guildId} error: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[BirthdayService] Check error: ${err.message}`);
  }
}

/**
 * Announces birthdays for a single guild.
 */
async function processGuildBirthdays(guildDoc, today, client) {
  const birthdayUsers = await User.find({
    guildId:  guildDoc.guildId,
    birthday: today,
  });

  if (birthdayUsers.length === 0) return;

  const discordGuild = client.guilds.cache.get(guildDoc.guildId);
  if (!discordGuild) return;

  const channel = await client.channels.fetch(guildDoc.birthdayChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  for (const userDoc of birthdayUsers) {
    try {
      const member = await discordGuild.members.fetch(userDoc.userId).catch(() => null);
      if (!member) continue;

      // Announce
      const embed = buildEmbed({
        type:        'primary',
        title:       '🎂 Happy Birthday!',
        description: `Today is **${member.user.username}**'s birthday! 🎉\n\nWish them a happy birthday! <@${member.id}>`,
        thumbnail:   member.user.displayAvatarURL({ size: 256 }),
      });

      await channel.send({
        embeds: [embed],
        allowedMentions: { users: [member.id] },
      });

      // Assign birthday role if configured
      if (guildDoc.birthdayRoleId) {
        const role = discordGuild.roles.cache.get(guildDoc.birthdayRoleId);
        if (role && member.manageable) {
          await member.roles.add(role, 'Birthday role').catch(() => {});

          // Remove after 24 hours
          setTimeout(async () => {
            try {
              await member.roles.remove(role, 'Birthday role expired').catch(() => {});
            } catch { /* ignore */ }
          }, 24 * 60 * 60 * 1000);
        }
      }
    } catch (err) {
      logger.warn(`[BirthdayService] User ${userDoc.userId} announce error: ${err.message}`);
    }
  }
}

module.exports = { start, checkBirthdays, processGuildBirthdays };
