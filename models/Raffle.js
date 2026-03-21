'use strict';

const { Schema, model } = require('mongoose');

const RaffleSchema = new Schema({
  guildId:   { type: String,   required: true },
  channelId: { type: String,   required: true },
  messageId: { type: String,   default: null  },
  hostId:    { type: String,   required: true },
  prize:     { type: String,   required: true },
  entries:   { type: [String], default: []   },
  winners:   { type: [String], default: []   },
  drawn:     { type: Boolean,  default: false },
  cancelled: { type: Boolean,  default: false },
}, { timestamps: true });

RaffleSchema.index({ guildId: 1, drawn: 1 });

module.exports = model('Raffle', RaffleSchema);
