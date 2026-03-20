'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const constants = {
  // ── Brand colors (decimal) ──────────────────────────────────────────────────
  COLORS: {
    PRIMARY: 0x7F77DD,
    SUCCESS: 0x1D9E75,
    ERROR:   0xE24B4A,
    WARNING: 0xEF9F27,
    INFO:    0x378ADD,
    NEUTRAL: 0x888780,
  },

  // ── Default fallback emojis (plain unicode, no custom IDs) ─────────────────
  EMOJIS: {
    SUCCESS:  '✅',
    ERROR:    '❌',
    WARNING:  '⚠️',
    INFO:     'ℹ️',
    LOADING:  '⏳',
    SHIELD:   '🛡️',
    TICKET:   '🎫',
    GIVEAWAY: '🎉',
    SOCIAL:   '📡',
    BACKUP:   '💾',
    NUKE:     '☢️',
    MOD:      '🔨',
    LOG:      '📋',
    STAR:     '⭐',
    MUSIC:    '🎵',
    ECONOMY:  '💰',
    LEVEL:    '⬆️',
    BIRTHDAY: '🎂',
    REMINDER: '⏰',
    INVITE:   '📨',
  },

  // ── Regex patterns ──────────────────────────────────────────────────────────
  REGEX: {
    INVITE_LINK:  /discord(?:\.gg|app\.com\/invite)\/([a-zA-Z0-9-]+)/gi,
    URL:          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
    MENTION_USER: /<@!?(\d+)>/g,
    MENTION_ROLE: /<@&(\d+)>/g,
    CHANNEL:      /<#(\d+)>/g,
    ID:           /^\d{17,20}$/,
    DURATION:     /^(\d+)(s|m|h|d|w)$/i,
  },

  // ── Default config values used when guild has no config yet ────────────────
  DEFAULT_CONFIG: {
    prefix:           '!',
    language:         'en',
    muteRole:         null,
    logChannel:       null,
    welcomeChannel:   null,
    welcomeMessage:   'Welcome to {server}, {user}!',
    autoRole:         null,
    antiNukeEnabled:  false,
    antiRaidEnabled:  false,
    antispamEnabled:  false,
    automodEnabled:   false,
    levelingEnabled:  true,
    economyEnabled:   true,
  },

  // ── Duration map (duration string → ms) ────────────────────────────────────
  DURATION_MAP: {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7  * 24 * 60 * 60 * 1000,
  },

  // ── Max durations for mute/timeout ─────────────────────────────────────────
  MAX_TIMEOUT_MS: 28 * 24 * 60 * 60 * 1000, // 28 days (Discord limit)

  // ── Bot version ────────────────────────────────────────────────────────────
  VERSION: '1.0.0',
  YEAR:    '2026',
};

module.exports = constants;
