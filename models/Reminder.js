'use strict';

const { Schema, model } = require('mongoose');

const ReminderSchema = new Schema({
  userId:    { type: String, required: true },
  guildId:   { type: String, default: null  },
  channelId: { type: String, default: null  },
  message:   { type: String, required: true },
  fireAt:    { type: Date,   required: true },
  fired:     { type: Boolean,default: false },
}, { timestamps: true });

ReminderSchema.index({ fireAt: 1, fired: 1 });
ReminderSchema.index({ userId: 1, fired: 1 });

module.exports = model('Reminder', ReminderSchema);
