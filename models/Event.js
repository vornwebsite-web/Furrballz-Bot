'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const EventSchema = new Schema({
  guildId:      { type: String, required: true },
  hostId:       { type: String, required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: null  },
  channelId:    { type: String, default: null  },
  messageId:    { type: String, default: null  },
  startsAt:     { type: Date,   default: null  },
  remindAt:     { type: Date,   default: null  },
  rsvp:         { type: [String], default: []  },
  winnersCount: { type: Number, default: 0     },
  winners:      { type: [String], default: []  },
  ended:        { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Event', EventSchema);
