'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const AppealSchema = new Schema({
  userId:     { type: String, required: true },
  guildId:    { type: String, required: true },
  caseId:     { type: String, required: true },
  reason:     { type: String, required: true },
  status:     { type: String, default: 'pending', enum: ['pending', 'approved', 'denied'] },
  reviewerId: { type: String, default: null },
  reviewNote: { type: String, default: null },
}, {
  timestamps: true,
});

AppealSchema.index({ userId: 1, guildId: 1 });
AppealSchema.index({ caseId: 1 });

module.exports = model('Appeal', AppealSchema);
