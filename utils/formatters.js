'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const constants = require('./constants');

/**
 * Converts milliseconds to a human-readable duration string.
 * e.g. 90061000 → "1d 1h 1m 1s"
 * @param {number} ms
 * @returns {string}
 */
function ms(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0s';

  const s = Math.floor(milliseconds / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const parts = [];
  if (d)   parts.push(`${d}d`);
  if (h)   parts.push(`${h}h`);
  if (m)   parts.push(`${m}m`);
  if (sec) parts.push(`${sec}s`);

  return parts.join(' ') || '0s';
}

/**
 * Formats a byte count into a human-readable size string.
 * e.g. 1048576 → "1.00 MB"
 * @param {number} bytes
 * @returns {string}
 */
function bytes(b) {
  if (b < 1024)              return `${b} B`;
  if (b < 1024 * 1024)      return `${(b / 1024).toFixed(2)} KB`;
  if (b < 1024 ** 3)        return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Formats a number with comma separators.
 * e.g. 1234567 → "1,234,567"
 * @param {number} n
 * @returns {string}
 */
function number(n) {
  return Number(n).toLocaleString('en-US');
}

/**
 * Truncates a string to a max length and appends "..." if truncated.
 * @param {string} str
 * @param {number} [max=100]
 * @returns {string}
 */
function truncate(str, max = 100) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/**
 * Returns a Discord relative timestamp string.
 * e.g. relativeTime(Date.now() + 60000) → "<t:1234567890:R>"
 * @param {number|Date} time - Unix ms or Date object
 * @returns {string}
 */
function relativeTime(time) {
  const unix = Math.floor((time instanceof Date ? time.getTime() : time) / 1000);
  return `<t:${unix}:R>`;
}

/**
 * Returns a Discord full timestamp string.
 * @param {number|Date} time
 * @param {'t'|'T'|'d'|'D'|'f'|'F'|'R'} [style='f']
 * @returns {string}
 */
function discordTimestamp(time, style = 'f') {
  const unix = Math.floor((time instanceof Date ? time.getTime() : time) / 1000);
  return `<t:${unix}:${style}>`;
}

/**
 * Wraps text in a Discord code block.
 * @param {string} text
 * @param {string} [lang=''] - Language for syntax highlighting
 * @returns {string}
 */
function codeBlock(text, lang = '') {
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

/**
 * Wraps text in inline code.
 * @param {string} text
 * @returns {string}
 */
function inlineCode(text) {
  return `\`${text}\``;
}

/**
 * Parses a duration string like "1d2h30m10s" into milliseconds.
 * @param {string} str
 * @returns {number|null} - null if invalid
 */
function parseDuration(str) {
  if (!str) return null;
  const regex = /(\d+)(s|m|h|d|w)/gi;
  let total = 0;
  let match;
  let found = false;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit  = match[2].toLowerCase();
    total += value * (constants.DURATION_MAP[unit] || 0);
    found = true;
  }

  return found ? total : null;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Ordinal suffix for a number. e.g. 1 → "1st", 2 → "2nd"
 * @param {number} n
 * @returns {string}
 */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = {
  ms,
  bytes,
  number,
  truncate,
  relativeTime,
  discordTimestamp,
  codeBlock,
  inlineCode,
  parseDuration,
  capitalize,
  ordinal,
};
