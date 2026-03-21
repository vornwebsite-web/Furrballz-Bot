'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const categorySchema = new Schema({
  label:        { type: String, required: true },
  value:        { type: String, required: true },
  description:  { type: String, default: null  },
  emoji:        { type: String, default: null  },
  logChannelId: { type: String, default: null  },
  pingRoleId:   { type: String, default: null  },
}, { _id: false });

const TicketConfigSchema = new Schema({
  guildId:          { type: String, required: true, unique: true },
  panelChannelId:   { type: String, default: null  },
  panelMessageId:   { type: String, default: null  },
  categoryId:       { type: String, default: null  },
  // Up to 10 support roles — all get view/send perms on every ticket channel
  supportRoleIds:   {
    type:     [String],
    default:  [],
    validate: {
      validator: (arr) => arr.length <= 10,
      message:   'Maximum of 10 support roles allowed.',
    },
  },
  logChannelId:      { type: String, default: null  },
  maxOpenPerUser:    { type: Number, default: 1     },
  autoCloseHours:    { type: Number, default: 0     },
  panelTitle:        { type: String, default: 'Support Tickets' },
  panelDescription:  { type: String, default: 'Click the button below to open a support ticket.' },
  buttonLabel:       { type: String, default: 'Open a Ticket' },
  buttonEmoji:       { type: String, default: '🎫'  },
  categories:        { type: [categorySchema], default: [] },
}, { timestamps: true });

TicketConfigSchema.statics.getOrCreate = async function (guildId) {
  let cfg = await this.findOne({ guildId });
  if (!cfg) cfg = await this.create({ guildId });
  return cfg;
};

module.exports = model('TicketConfig', TicketConfigSchema);
