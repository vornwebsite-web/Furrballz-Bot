'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const StarboardSchema = new Schema({
  guildId:        { type: String, required: true },
  originalMsgId:  { type: String, required: true },
  originalChannelId: { type: String, required: true },
  starboardMsgId: { type: String, default: null  },
  starboardChannelId: { type: String, required: true },
  authorId:       { type: String, required: true },
  stars:          { type: Number, default: 0     },
  starredBy:      { type: [String], default: []  },
}, { timestamps: true });

StarboardSchema.index({ originalMsgId: 1 }, { unique: true });
StarboardSchema.index({ guildId: 1 });

module.exports = model('Starboard', StarboardSchema);
