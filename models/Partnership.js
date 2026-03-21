'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const PartnershipSchema = new Schema({
  guildId:        { type: String, required: true },
  partnerGuildId: { type: String, required: true },
  partnerName:    { type: String, default: null  },
  contactId:      { type: String, required: true },
  channelId:      { type: String, default: null  },
  inviteUrl:      { type: String, default: null  },
  description:    { type: String, default: null  },
  bumpSchedule:   { type: String, default: null  }, // cron string e.g. "0 12 * * *"
  lastBumpAt:     { type: Date,   default: null  },
  active:         { type: Boolean,default: true  },
}, { timestamps: true });

PartnershipSchema.index({ guildId: 1, active: 1 });
PartnershipSchema.index({ guildId: 1, partnerGuildId: 1 }, { unique: true });

module.exports = model('Partnership', PartnershipSchema);
