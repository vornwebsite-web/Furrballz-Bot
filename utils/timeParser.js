'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const constants = require('./constants');

/**
 * Parses a duration string like "1d2h30m10s" or "7d" into milliseconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days), w (weeks)
 *
 * @param {string} str
 * @returns {{ ms: number, valid: boolean, reason?: string }}
 */
function parse(str) {
  if (!str || typeof str !== 'string') {
    return { ms: 0, valid: false, reason: 'No duration provided.' };
  }

  const regex = /(\d+)(s|m|h|d|w)/gi;
  let total = 0;
  let found = false;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit  = match[2].toLowerCase();
    total += value * (constants.DURATION_MAP[unit] || 0);
    found = true;
  }

  if (!found) {
    return {
      ms:     0,
      valid:  false,
      reason: `Could not parse \`${str}\`. Use formats like \`10m\`, \`1h30m\`, \`7d\`.`,
    };
  }

  return { ms: total, valid: true };
}

/**
 * Parses a duration and validates it falls within min/max bounds.
 *
 * @param {string} str
 * @param {object} [bounds]
 * @param {number} [bounds.min=1000]       - Minimum ms (default 1 second)
 * @param {number} [bounds.max]            - Maximum ms (default Discord timeout limit)
 * @param {string} [bounds.label='duration'] - Label used in error messages
 * @returns {{ ms: number, valid: boolean, reason?: string }}
 */
function parseWithBounds(str, bounds = {}) {
  const {
    min   = 1000,
    max   = constants.MAX_TIMEOUT_MS,
    label = 'duration',
  } = bounds;

  const result = parse(str);
  if (!result.valid) return result;

  if (result.ms < min) {
    return {
      ms:     0,
      valid:  false,
      reason: `The ${label} must be at least **${humanize(min)}**.`,
    };
  }

  if (result.ms > max) {
    return {
      ms:     0,
      valid:  false,
      reason: `The ${label} cannot exceed **${humanize(max)}**.`,
    };
  }

  return result;
}

/**
 * Converts milliseconds to a short human-readable string.
 * e.g. 90000 → "1m 30s"
 * @param {number} ms
 * @returns {string}
 */
function humanize(ms) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
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

module.exports = { parse, parseWithBounds, humanize };
