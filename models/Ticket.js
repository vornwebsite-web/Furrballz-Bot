'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const TicketSchema = new Schema({
  ticketId:      { type: String, required: true },
  guildId:       { type: String, required: true },
  channelId:     { type: String, required: true, unique: true },
  openerId:      { type: String, required: true },
  claimerId:     { type: String, default: null  },
  category:      { type: String, default: 'General' },
  subject:       { type: String, default: null  },
  description:   { type: String, default: null  },
  status:        { type: String, default: 'open', enum: ['open', 'claimed', 'closed'] },
  transcriptUrl: { type: String, default: null  },
  addedUsers:    { type: [String], default: []  },
  closedAt:      { type: Date,   default: null  },
  closedById:    { type: String, default: null  },
}, {
  timestamps: true,
});

TicketSchema.index({ guildId: 1, status: 1 });
TicketSchema.index({ openerId: 1, guildId: 1 });

module.exports = model('Ticket', TicketSchema);
