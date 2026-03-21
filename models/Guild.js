'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const logChannelsSchema = new Schema({
  messageDelete:    { type: String, default: null },
  messageUpdate:    { type: String, default: null },
  memberJoin:       { type: String, default: null },
  memberLeave:      { type: String, default: null },
  memberUpdate:     { type: String, default: null },
  banAdd:           { type: String, default: null },
  banRemove:        { type: String, default: null },
  channelCreate:    { type: String, default: null },
  channelDelete:    { type: String, default: null },
  channelUpdate:    { type: String, default: null },
  roleCreate:       { type: String, default: null },
  roleDelete:       { type: String, default: null },
  roleUpdate:       { type: String, default: null },
  voiceUpdate:      { type: String, default: null },
  inviteCreate:     { type: String, default: null },
  guildUpdate:      { type: String, default: null },
  modAction:        { type: String, default: null },
}, { _id: false });

const welcomeSchema = new Schema({
  enabled:   { type: Boolean, default: false },
  channelId: { type: String,  default: null  },
  message:   { type: String,  default: 'Welcome to **{server}**, {user}! You are member #{count}.' },
  dmMessage: { type: String,  default: null  },
  roleId:    { type: String,  default: null  },
  embedColor:{ type: Number,  default: 0x7F77DD },
}, { _id: false });

const automodSchema = new Schema({
  enabled:        { type: Boolean, default: false },
  filterInvites:  { type: Boolean, default: false },
  filterLinks:    { type: Boolean, default: false },
  filterCaps:     { type: Boolean, default: false },
  capsThreshold:  { type: Number,  default: 70   },
  filterMentions: { type: Boolean, default: false },
  mentionLimit:   { type: Number,  default: 5    },
  bannedWords:    { type: [String],default: []   },
  logChannelId:   { type: String,  default: null },
  action:         { type: String,  default: 'delete', enum: ['delete','warn','mute','kick'] },
  whitelist: {
    channels: { type: [String], default: [] },
    roles:    { type: [String], default: [] },
  },
}, { _id: false });

const antispamSchema = new Schema({
  enabled:      { type: Boolean, default: false },
  threshold:    { type: Number,  default: 5    },
  interval:     { type: Number,  default: 5000 },
  action:       { type: String,  default: 'mute', enum: ['warn','mute','kick','ban'] },
  muteDuration: { type: Number,  default: 5 * 60 * 1000 },
  whitelist: {
    channels: { type: [String], default: [] },
    roles:    { type: [String], default: [] },
  },
}, { _id: false });

const starboardSchema = new Schema({
  enabled:    { type: Boolean, default: false },
  channelId:  { type: String,  default: null  },
  threshold:  { type: Number,  default: 3     },
  emoji:      { type: String,  default: '⭐'  },
  ignoredChannels: { type: [String], default: [] },
}, { _id: false });

const countingSchema = new Schema({
  enabled:   { type: Boolean, default: false },
  channelId: { type: String,  default: null  },
  count:     { type: Number,  default: 0     },
  lastUserId:{ type: String,  default: null  },
  highscore: { type: Number,  default: 0     },
  brokenBy:  { type: String,  default: null  },
  resetCount:{ type: Number,  default: 0     },
}, { _id: false });

const levelingSchema = new Schema({
  enabled:         { type: Boolean, default: true  },
  announceChannel: { type: String,  default: null  },
  xpMin:           { type: Number,  default: 15    },
  xpMax:           { type: Number,  default: 40    },
  xpCooldown:      { type: Number,  default: 60000 },
  ignoredChannels: { type: [String],default: []    },
  ignoredRoles:    { type: [String],default: []    },
  levelRoles:      { type: Map, of: String, default: {} },
}, { _id: false });

const economySchema = new Schema({
  enabled:      { type: Boolean, default: true },
  currencyName: { type: String,  default: 'coins' },
  currencyEmoji:{ type: String,  default: '🪙'   },
  dailyAmount:  { type: Number,  default: 100    },
  workMin:      { type: Number,  default: 50     },
  workMax:      { type: Number,  default: 200    },
}, { _id: false });

const verifySchema = new Schema({
  enabled:   { type: Boolean, default: false },
  channelId: { type: String,  default: null  },
  roleId:    { type: String,  default: null  },
  logChannelId: { type: String, default: null },
  message:   { type: String,  default: 'Click the button below to verify and gain access to the server.' },
}, { _id: false });

const GuildSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix:  { type: String, default: '!' },

  logChannels:  { type: logChannelsSchema,  default: () => ({}) },
  welcome:      { type: welcomeSchema,      default: () => ({}) },
  automod:      { type: automodSchema,      default: () => ({}) },
  antispam:     { type: antispamSchema,     default: () => ({}) },
  starboard:    { type: starboardSchema,    default: () => ({}) },
  counting:     { type: countingSchema,     default: () => ({}) },
  leveling:     { type: levelingSchema,     default: () => ({}) },
  economy:      { type: economySchema,      default: () => ({}) },
  verify:       { type: verifySchema,       default: () => ({}) },

  muteRoleId:          { type: String,  default: null  },
  suggestionChannelId: { type: String,  default: null  },
  birthdayChannelId:   { type: String,  default: null  },
  birthdayRoleId:      { type: String,  default: null  },
  partnerChannelId:    { type: String,  default: null  },
  boostChannelId:      { type: String,  default: null  },
  boostMessage:        { type: String,  default: null  },
  boostRoleId:         { type: String,  default: null  }, // role assigned when member boosts
  inviteLogChannelId:  { type: String,  default: null  }, // channel for invite join messages

  // ── Alt / new account protection ───────────────────────────────────────────
  altProtection: {
    enabled:           { type: Boolean, default: false },
    minAccountAgeDays: { type: Number,  default: 7     }, // kick if account younger than X days
    action:            { type: String,  default: 'kick', enum: ['kick', 'ban', 'alert'] },
    alertChannelId:    { type: String,  default: null  }, // channel to alert mods (always used)
    ignoreInviterId:   { type: [String],default: []    }, // inviter IDs exempt from alt check
    blockDefaultAvatar:{ type: Boolean, default: false }, // also flag accounts with no avatar
  },
  tempVoiceCategoryId: { type: String,  default: null  },
  tempVoiceTriggerChannelId: { type: String, default: null },

  ignoredLogChannels: { type: [String], default: [] },
  autoRoles:          { type: [String], default: [] },
  stickyMessages:     { type: Map, of: String, default: {} },
}, {
  timestamps: true,
});

/**
 * Fetches a guild config doc, creating one with defaults if it doesn't exist.
 * @param {string} guildId
 * @returns {Promise<Document>}
 */
GuildSchema.statics.getOrCreate = async function (guildId) {
  let guild = await this.findOne({ guildId });
  if (!guild) {
    guild = await this.create({ guildId });
  }
  return guild;
};

module.exports = model('Guild', GuildSchema);
