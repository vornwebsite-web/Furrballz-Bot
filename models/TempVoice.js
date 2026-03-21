'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const TempVoiceSchema = new Schema({
  channelId:  { type: String, required: true, unique: true },
  guildId:    { type: String, required: true },
  ownerId:    { type: String, required: true },
  name:       { type: String, default: null  },
  userLimit:  { type: Number, default: 0     }, // 0 = unlimited
  locked:     { type: Boolean,default: false },
  hidden:     { type: Boolean,default: false },
  allowedUsers:  { type: [String], default: [] },
  bannedUsers:   { type: [String], default: [] },
}, { timestamps: true });

TempVoiceSchema.index({ guildId: 1 });
TempVoiceSchema.index({ ownerId: 1 });

module.exports = model('TempVoice', TempVoiceSchema);
