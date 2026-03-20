'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { error: errorEmbed } = require('./embedBuilder');

/**
 * Replies to an interaction with a styled ephemeral error embed.
 * Handles both unresponded and already-deferred interactions.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {string} message - The error message to display
 * @param {string} [title='Error'] - Optional custom title
 */
async function errorReply(interaction, message, title = 'Error') {
  const embed = errorEmbed(message, title);
  const payload = { embeds: [embed], ephemeral: true };

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    // Interaction may have expired — fail silently
  }
}

/**
 * Replies with a "missing permissions" error.
 * @param {import('discord.js').Interaction} interaction
 */
async function noPermission(interaction) {
  return errorReply(
    interaction,
    'You do not have permission to use this command.',
    'Permission Denied',
  );
}

/**
 * Replies with a "bot missing permissions" error.
 * @param {import('discord.js').Interaction} interaction
 * @param {string} [perm] - The permission the bot needs
 */
async function botNoPermission(interaction, perm) {
  const msg = perm
    ? `I need the **${perm}** permission to do that.`
    : 'I am missing permissions required to execute this action.';
  return errorReply(interaction, msg, 'Missing Permissions');
}

/**
 * Replies with a cooldown message.
 * @param {import('discord.js').Interaction} interaction
 * @param {number} seconds - Remaining cooldown in seconds
 */
async function onCooldown(interaction, seconds) {
  return errorReply(
    interaction,
    `You are on cooldown. Try again in **${seconds.toFixed(1)}s**.`,
    'Slow Down',
  );
}

/**
 * Replies with a generic "something went wrong" message.
 * @param {import('discord.js').Interaction} interaction
 */
async function unknownError(interaction) {
  return errorReply(
    interaction,
    'An unexpected error occurred. Please try again later.',
    'Something Went Wrong',
  );
}

module.exports = { errorReply, noPermission, botNoPermission, onCooldown, unknownError };
