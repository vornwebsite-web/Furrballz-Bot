'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { EmbedBuilder } = require('discord.js');
const config    = require('../config');
const constants = require('./constants');

/**
 * Creates a branded embed with consistent Furrballz Bot™ styling.
 *
 * @param {object} options
 * @param {string}  [options.type='primary']  - Color type: primary | success | error | warning | info | neutral
 * @param {string}  [options.title]           - Embed title
 * @param {string}  [options.description]     - Embed description
 * @param {Array}   [options.fields]          - Array of { name, value, inline } field objects
 * @param {string}  [options.thumbnail]       - Thumbnail URL
 * @param {string}  [options.image]           - Large image URL
 * @param {string}  [options.footer]          - Footer text (bot name appended automatically)
 * @param {boolean} [options.timestamp=true]  - Whether to include current timestamp
 * @param {string}  [options.url]             - Title URL
 * @param {object}  [options.author]          - { name, iconURL, url }
 * @returns {EmbedBuilder}
 */
function buildEmbed(options = {}) {
  const {
    type        = 'primary',
    title,
    description,
    fields      = [],
    thumbnail,
    image,
    footer,
    timestamp   = true,
    url,
    author,
  } = options;

  const colorMap = {
    primary: constants.COLORS.PRIMARY,
    success: constants.COLORS.SUCCESS,
    error:   constants.COLORS.ERROR,
    warning: constants.COLORS.WARNING,
    info:    constants.COLORS.INFO,
    neutral: constants.COLORS.NEUTRAL,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[type] ?? constants.COLORS.PRIMARY);

  if (title)       embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (url)         embed.setURL(url);
  if (thumbnail)   embed.setThumbnail(thumbnail);
  if (image)       embed.setImage(image);
  if (timestamp)   embed.setTimestamp();

  if (fields.length > 0) embed.addFields(fields);

  if (author) {
    embed.setAuthor({
      name:    author.name,
      iconURL: author.iconURL || null,
      url:     author.url     || null,
    });
  }

  const footerText = footer
    ? `${footer} • ${config.botName}`
    : config.botName;

  embed.setFooter({ text: footerText });

  return embed;
}

// ── Shorthand helpers ─────────────────────────────────────────────────────────

/** Quick success embed */
function success(description, title) {
  return buildEmbed({ type: 'success', title, description });
}

/** Quick error embed */
function error(description, title = 'Error') {
  return buildEmbed({ type: 'error', title, description });
}

/** Quick warning embed */
function warning(description, title = 'Warning') {
  return buildEmbed({ type: 'warning', title, description });
}

/** Quick info embed */
function info(description, title) {
  return buildEmbed({ type: 'info', title, description });
}

/** Quick neutral/gray embed */
function neutral(description, title) {
  return buildEmbed({ type: 'neutral', title, description });
}

module.exports = { buildEmbed, success, error, warning, info, neutral };
