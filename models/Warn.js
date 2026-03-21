'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const WarnSchema = new Schema({
  caseId:      { type: String, default: () => uuidv4().slice(0, 8).toUpperCase() },
  userId:      { type: String, required: true },
  guildId:     { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason:      { type: String, default: 'No reason provided.' },
  active:      { type: Boolean, default: true },
}, {
  timestamps: true,
});

WarnSchema.index({ userId: 1, guildId: 1 });
WarnSchema.index({ caseId: 1 });

module.exports = model('Warn', WarnSchema);
