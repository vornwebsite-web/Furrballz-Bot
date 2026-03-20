'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { buildEmbed } = require('../utils/embedBuilder');
const logger         = require('../utils/logger');

/**
 * Sends a log embed to a specified channel.
 *
 * @param {import('discord.js').Client} client
 * @param {string} channelId   - The log channel ID
 * @param {object} options
 * @param {string}  options.type        - Log type identifier
 * @param {string}  [options.color]     - Embed color type
 * @param {string}  [options.title]     - Embed title
 * @param {string}  [options.description]
 * @param {Array}   [options.fields]
 * @param {string}  [options.thumbnail]
 * @param {string}  [options.image]
 */
async function send(client, channelId, options = {}) {
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = buildEmbed({
      type:        options.color       || 'neutral',
      title:       options.title       || null,
      description: options.description || null,
      fields:      options.fields      || [],
      thumbnail:   options.thumbnail   || null,
      image:       options.image       || null,
      timestamp:   true,
    });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.warn(`[LogService] Failed to send log to ${channelId}: ${err.message}`);
  }
}

module.exports = { send };
