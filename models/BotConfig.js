'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const BotConfigSchema = new Schema({
  // Singleton doc — always use BotConfig.get()
  _id: { type: String, default: 'global' },

  mode:         { type: String, default: 'private', enum: ['public', 'private'] },
  maintenance:  { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: 'The bot is currently under maintenance. Please check back later.' },

  // In private mode, only these guild IDs can use the bot
  allowedGuilds: { type: [String], default: [] },

  // Global blacklist (checked before anything else)
  blacklistedUsers:  { type: [String], default: [] },
  blacklistedGuilds: { type: [String], default: [] },

  // Presence config
  presenceStatus:   { type: String, default: 'online', enum: ['online', 'idle', 'dnd', 'invisible'] },
  presenceType:     { type: String, default: 'Watching', enum: ['Playing', 'Watching', 'Listening', 'Competing', 'Streaming'] },
  presenceText:     { type: String, default: 'TheFurrballz Hotel' },
  presenceStreamUrl:{ type: String, default: null },

  // Stats (incremented at runtime, not persisted between restarts by default)
  totalCommandsRun: { type: Number, default: 0 },

  // Support / links
  supportServerId:  { type: String, default: null },
  inviteLink:       { type: String, default: null },
}, {
  _id: false,
  timestamps: true,
});

/**
 * Gets the singleton global bot config, creating it if it doesn't exist.
 * @returns {Promise<Document>}
 */
BotConfigSchema.statics.get = async function () {
  let cfg = await this.findById('global');
  if (!cfg) cfg = await this.create({ _id: 'global' });
  return cfg;
};

/**
 * Checks if a guild is allowed to use the bot.
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
BotConfigSchema.statics.isGuildAllowed = async function (guildId) {
  const cfg = await this.get();
  if (cfg.blacklistedGuilds.includes(guildId)) return false;
  if (cfg.mode === 'public') return true;
  return cfg.allowedGuilds.includes(guildId);
};

/**
 * Checks if a user is globally blacklisted.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
BotConfigSchema.statics.isUserBlacklisted = async function (userId) {
  const cfg = await this.get();
  return cfg.blacklistedUsers.includes(userId);
};

module.exports = model('BotConfig', BotConfigSchema);
