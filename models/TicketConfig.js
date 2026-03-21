'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const categorySchema = new Schema({
  label:       { type: String, required: true },
  value:       { type: String, required: true },
  description: { type: String, default: null  },
  emoji:       { type: String, default: null  },
  logChannelId:{ type: String, default: null  },
  pingRoleId:  { type: String, default: null  },
}, { _id: false });

const TicketConfigSchema = new Schema({
  guildId:         { type: String, required: true, unique: true },
  panelChannelId:  { type: String, default: null  },
  panelMessageId:  { type: String, default: null  },
  categoryId:      { type: String, default: null  }, // Discord category channel
  supportRoleIds:  { type: [String], default: []  },
  logChannelId:    { type: String, default: null  },
  maxOpenPerUser:  { type: Number, default: 1     },
  autoCloseHours:  { type: Number, default: 0     }, // 0 = disabled
  panelTitle:      { type: String, default: 'Support Tickets' },
  panelDescription:{ type: String, default: 'Click the button below to open a support ticket.' },
  buttonLabel:     { type: String, default: 'Open a Ticket' },
  buttonEmoji:     { type: String, default: '🎫'  },
  categories:      { type: [categorySchema], default: [] },
}, {
  timestamps: true,
});

/**
 * Gets or creates the ticket config for a guild.
 * @param {string} guildId
 * @returns {Promise<Document>}
 */
TicketConfigSchema.statics.getOrCreate = async function (guildId) {
  let cfg = await this.findOne({ guildId });
  if (!cfg) cfg = await this.create({ guildId });
  return cfg;
};

module.exports = model('TicketConfig', TicketConfigSchema);
