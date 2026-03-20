'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const Reminder   = require('../models/Reminder');
const { buildEmbed } = require('../utils/embedBuilder');
const logger     = require('../utils/logger');
const config     = require('../config');

/**
 * Starts the reminder check interval.
 * @param {import('discord.js').Client} client
 */
function start(client) {
  setInterval(() => checkReminders(client), config.intervals.reminderCheck);
  logger.info('[ReminderService] Started');
}

/**
 * Finds all due reminders, fires them, and marks as fired.
 */
async function checkReminders(client) {
  try {
    const due = await Reminder.find({
      fired:  false,
      fireAt: { $lte: new Date() },
    }).limit(50);

    for (const reminder of due) {
      reminder.fired = true;
      await reminder.save();
      await fireReminder(reminder, client);
    }
  } catch (err) {
    logger.error(`[ReminderService] Check error: ${err.message}`);
  }
}

/**
 * Sends the reminder to the user via DM or channel.
 */
async function fireReminder(reminder, client) {
  try {
    const embed = buildEmbed({
      type:        'info',
      title:       '⏰ Reminder',
      description: reminder.message,
      timestamp:   true,
    });

    // Try channel first, fall back to DM
    let sent = false;

    if (reminder.channelId) {
      const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({
          content: `<@${reminder.userId}>`,
          embeds:  [embed],
          allowedMentions: { users: [reminder.userId] },
        });
        sent = true;
      }
    }

    if (!sent) {
      const user = await client.users.fetch(reminder.userId).catch(() => null);
      if (user) await user.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    logger.warn(`[ReminderService] Fire failed for ${reminder._id}: ${err.message}`);
  }
}

module.exports = { start, checkReminders, fireReminder };
