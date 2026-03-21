'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const MuteSchema = new Schema({
  userId:      { type: String, required: true },
  guildId:     { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason:      { type: String, default: 'No reason provided.' },
  expiresAt:   { type: Date,   default: null  }, // null = permanent
  roleBackup:  { type: [String], default: []  }, // role IDs removed on mute
  active:      { type: Boolean, default: true },
}, {
  timestamps: true,
});

MuteSchema.index({ userId: 1, guildId: 1, active: 1 });
MuteSchema.index({ expiresAt: 1 });

module.exports = model('Mute', MuteSchema);
