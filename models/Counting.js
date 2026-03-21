'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const CountingSchema = new Schema({
  guildId:    { type: String, required: true, unique: true },
  channelId:  { type: String, default: null  },
  count:      { type: Number, default: 0     },
  lastUserId: { type: String, default: null  }, // prevents same user counting twice in a row
  highscore:  { type: Number, default: 0     },
  brokenBy:   { type: String, default: null  }, // userId who last broke the count
  resetCount: { type: Number, default: 0     }, // how many times the count has been broken
  enabled:    { type: Boolean, default: false },
}, {
  timestamps: true,
});

CountingSchema.index({ guildId: 1 });

/**
 * Gets or creates the counting config for a guild.
 * @param {string} guildId
 * @returns {Promise<Document>}
 */
CountingSchema.statics.getOrCreate = async function (guildId) {
  let doc = await this.findOne({ guildId });
  if (!doc) doc = await this.create({ guildId });
  return doc;
};

module.exports = model('Counting', CountingSchema);
