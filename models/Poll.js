'use strict';

const { Schema, model } = require('mongoose');

const PollSchema = new Schema({
  guildId:   { type: String,   required: true },
  channelId: { type: String,   required: true },
  messageId: { type: String,   default: null  },
  hostId:    { type: String,   required: true },
  question:  { type: String,   required: true },
  options:   { type: [String], required: true },
  votes:     { type: Map, of: [String], default: {} }, // optionIndex → [userId]
  ended:     { type: Boolean,  default: false },
  endsAt:    { type: Date,     default: null  },
}, { timestamps: true });

PollSchema.index({ guildId: 1, ended: 1 });

module.exports = model('Poll', PollSchema);
