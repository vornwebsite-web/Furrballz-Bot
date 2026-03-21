'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { EmbedBuilder } = require('discord.js');
const config    = require('../config');
const constants = require('./constants');

// ── Brand identity ────────────────────────────────────────────────────────────

const BRAND = {
  name:   config.botName || 'Furrballz Bot™',
  icon:   null, // set to bot avatar URL at runtime if desired
};

// ── Divider bar used in rich embeds ──────────────────────────────────────────
const DIVIDER = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: 0x7F77DD,  // Furrballz purple
  success: 0x1EBA7A,  // Vivid green
  error:   0xFF4757,  // Vivid red
  warning: 0xFFA502,  // Vivid amber
  info:    0x1A8FE3,  // Vivid blue
  neutral: 0x747D8C,  // Muted gray
  mod:     0xFD9644,  // Mod orange
  economy: 0xF9CA24,  // Gold
  level:   0xA29BFE,  // Soft purple
  boost:   0xFF6EB4,  // Boost pink
};

// ── Type → color + decorators ─────────────────────────────────────────────────
const TYPE_META = {
  primary: { color: COLORS.primary, badge: '🐾',  label: BRAND.name   },
  success: { color: COLORS.success, badge: '✅',  label: 'Success'    },
  error:   { color: COLORS.error,   badge: '❌',  label: 'Error'      },
  warning: { color: COLORS.warning, badge: '⚠️', label: 'Warning'    },
  info:    { color: COLORS.info,    badge: 'ℹ️', label: 'Info'       },
  neutral: { color: COLORS.neutral, badge: '◈',   label: BRAND.name   },
  mod:     { color: COLORS.mod,     badge: '🔨',  label: 'Moderation' },
  economy: { color: COLORS.economy, badge: '🪙',  label: 'Economy'    },
  level:   { color: COLORS.level,   badge: '⬆️', label: 'Leveling'   },
  boost:   { color: COLORS.boost,   badge: '💎',  label: 'Boost'      },
};

/**
 * Core embed builder — ultra-branded, consistent design across all responses.
 *
 * @param {object}  opts
 * @param {string}  [opts.type='primary']    - Color/style type
 * @param {string}  [opts.title]             - Embed title (auto-prefixed with badge)
 * @param {string}  [opts.description]       - Embed body text
 * @param {Array}   [opts.fields]            - Array of { name, value, inline }
 * @param {string}  [opts.thumbnail]         - Thumbnail URL
 * @param {string}  [opts.image]             - Large image URL
 * @param {string}  [opts.footer]            - Extra footer text
 * @param {boolean} [opts.timestamp=true]    - Show timestamp
 * @param {string}  [opts.url]               - Title hyperlink
 * @param {object}  [opts.author]            - { name, iconURL, url }
 * @param {boolean} [opts.compact=false]     - Skip decorative footer divider
 * @returns {EmbedBuilder}
 */
function buildEmbed(opts = {}) {
  const {
    type      = 'primary',
    title,
    description,
    fields    = [],
    thumbnail,
    image,
    footer,
    timestamp = true,
    url,
    author,
    compact   = false,
  } = opts;

  const meta  = TYPE_META[type] ?? TYPE_META.primary;
  const embed = new EmbedBuilder().setColor(meta.color);

  // ── Title with badge ───────────────────────────────────────────────────────
  if (title) {
    embed.setTitle(`${meta.badge} ${title}`);
  }

  // ── Description ───────────────────────────────────────────────────────────
  if (description) embed.setDescription(description);

  // ── URL ───────────────────────────────────────────────────────────────────
  if (url) embed.setURL(url);

  // ── Author ────────────────────────────────────────────────────────────────
  if (author) {
    embed.setAuthor({
      name:    author.name,
      iconURL: author.iconURL || null,
      url:     author.url     || null,
    });
  }

  // ── Fields ────────────────────────────────────────────────────────────────
  if (fields.length > 0) embed.addFields(fields);

  // ── Media ─────────────────────────────────────────────────────────────────
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image)     embed.setImage(image);

  // ── Timestamp ─────────────────────────────────────────────────────────────
  if (timestamp) embed.setTimestamp();

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerParts = [BRAND.name];
  if (footer) footerParts.push(footer);
  embed.setFooter({ text: footerParts.join(' • ') });

  return embed;
}

// ── Shorthands ────────────────────────────────────────────────────────────────

const success  = (description, title) => buildEmbed({ type: 'success',  title, description });
const error    = (description, title = 'Error') => buildEmbed({ type: 'error',   title, description });
const warning  = (description, title = 'Warning') => buildEmbed({ type: 'warning', title, description });
const info     = (description, title) => buildEmbed({ type: 'info',    title, description });
const neutral  = (description, title) => buildEmbed({ type: 'neutral', title, description });
const modEmbed = (description, title) => buildEmbed({ type: 'mod',     title, description });

// ── Ultra design helpers ──────────────────────────────────────────────────────

/**
 * Builds a rich profile-style embed with header, fields, and colored left bar.
 */
function profileEmbed({ type = 'primary', title, description, fields = [], thumbnail, footer, timestamp = true } = {}) {
  return buildEmbed({ type, title, description, fields, thumbnail, footer, timestamp });
}

/**
 * Builds a paginated list embed with item count in footer.
 */
function listEmbed({ type = 'neutral', title, items = [], page = 1, totalPages = 1, footer } = {}) {
  const desc = items.length > 0 ? items.join('\n') : '*Nothing to display.*';
  const footerText = `Page ${page} / ${totalPages}${footer ? ` • ${footer}` : ''}`;
  return buildEmbed({ type, title, description: desc, footer: footerText });
}

/**
 * Builds a confirmation embed with action summary.
 */
function confirmEmbed({ action, target, moderator, reason, caseId, duration } = {}) {
  const fields = [];
  if (target)    fields.push({ name: '👤 Target',    value: target,    inline: true  });
  if (moderator) fields.push({ name: '🔨 Moderator', value: moderator, inline: true  });
  if (duration)  fields.push({ name: '⏱️ Duration',  value: duration,  inline: true  });
  if (reason)    fields.push({ name: '📝 Reason',    value: reason,    inline: false });
  if (caseId)    fields.push({ name: '🆔 Case ID',   value: `\`${caseId}\``, inline: true });

  return buildEmbed({
    type:        'mod',
    title:       action,
    fields,
    timestamp:   true,
  });
}

/**
 * Builds a stat card embed for economy/leveling.
 */
function statEmbed({ type = 'level', title, stats = [], thumbnail, footer } = {}) {
  const fields = stats.map(s => ({ name: s.name, value: s.value, inline: s.inline ?? true }));
  return buildEmbed({ type, title, fields, thumbnail, footer });
}

module.exports = {
  buildEmbed,
  success,
  error,
  warning,
  info,
  neutral,
  modEmbed,
  profileEmbed,
  listEmbed,
  confirmEmbed,
  statEmbed,
  COLORS,
  TYPE_META,
  DIVIDER,
};
