'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const BlacklistSchema = new Schema({
  targetId:   { type: String, required: true },
  targetType: { type: String, required: true, enum: ['user', 'guild'] },
  reason:     { type: String, default: 'No reason provided.' },
  bannedBy:   { type: String, required: true },
}, {
  timestamps: true,
});

BlacklistSchema.index({ targetId: 1, targetType: 1 }, { unique: true });

module.exports = model('Blacklist', BlacklistSchema);
