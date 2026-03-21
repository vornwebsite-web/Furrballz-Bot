'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const InviteCacheSchema = new Schema({
  guildId:    { type: String, required: true },
  inviteCode: { type: String, required: true },
  inviterId:  { type: String, default: null  },
  uses:       { type: Number, default: 0     },
  maxUses:    { type: Number, default: 0     }, // 0 = unlimited
  expiresAt:  { type: Date,   default: null  },
  isVanity:   { type: Boolean,default: false },
}, { timestamps: true });

InviteCacheSchema.index({ guildId: 1 });
InviteCacheSchema.index({ inviteCode: 1 }, { unique: true });
InviteCacheSchema.index({ inviterId: 1, guildId: 1 });

module.exports = model('InviteCache', InviteCacheSchema);
