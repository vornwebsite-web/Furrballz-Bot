'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const thresholdsSchema = new Schema({
  channelCreate: { type: Number, default: 5  },
  channelDelete: { type: Number, default: 3  },
  roleCreate:    { type: Number, default: 5  },
  roleDelete:    { type: Number, default: 3  },
  ban:           { type: Number, default: 5  },
  kick:          { type: Number, default: 5  },
  webhookCreate: { type: Number, default: 3  },
  roleStrip:     { type: Number, default: 3  },
}, { _id: false });

const actionLogEntrySchema = new Schema({
  userId:    { type: String, required: true },
  action:    { type: String, required: true },
  count:     { type: Number, required: true },
  punishment:{ type: String, required: true },
  triggeredAt: { type: Date, default: Date.now },
}, { _id: false });

const AntiNukeSchema = new Schema({
  guildId:     { type: String, required: true, unique: true },
  enabled:     { type: Boolean, default: false },
  whitelist:   { type: [String], default: []  }, // user/bot IDs that bypass checks
  punishment:  { type: String, default: 'ban', enum: ['ban', 'kick', 'strip', 'deowner', 'timeout'] },
  logChannelId:{ type: String, default: null  },
  thresholds:  { type: thresholdsSchema, default: () => ({}) },
  // Rolling window in seconds for action counting
  windowSeconds: { type: Number, default: 10 },
  // Recent alerts log (capped at 50)
  actionLog:   { type: [actionLogEntrySchema], default: [] },
}, { timestamps: true });

/**
 * Gets or creates the antinuke config for a guild.
 */
AntiNukeSchema.statics.getOrCreate = async function (guildId) {
  let doc = await this.findOne({ guildId });
  if (!doc) doc = await this.create({ guildId });
  return doc;
};

module.exports = model('AntiNuke', AntiNukeSchema);
