'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const requirementsSchema = new Schema({
  roleId:       { type: String, default: null },
  minLevel:     { type: Number, default: 0    },
  minMessages:  { type: Number, default: 0    },
}, { _id: false });

const GiveawaySchema = new Schema({
  guildId:      { type: String, required: true },
  channelId:    { type: String, required: true },
  messageId:    { type: String, default: null  },
  hostId:       { type: String, required: true },
  prize:        { type: String, required: true },
  winnersCount: { type: Number, default: 1     },
  endsAt:       { type: Date,   required: true },
  entries:      { type: [String], default: []  },
  winners:      { type: [String], default: []  },
  ended:        { type: Boolean, default: false },
  paused:       { type: Boolean, default: false },
  requirements: { type: requirementsSchema, default: () => ({}) },
}, {
  timestamps: true,
});

GiveawaySchema.index({ guildId: 1, ended: 1 });
GiveawaySchema.index({ endsAt: 1, ended: 1 });

module.exports = model('Giveaway', GiveawaySchema);
