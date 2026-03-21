'use strict';

const { Schema, model } = require('mongoose');

const TagSchema = new Schema({
  guildId:      { type: String, required: true },
  name:         { type: String, required: true },
  content:      { type: String, required: true },
  authorId:     { type: String, required: true },
  uses:         { type: Number, default: 0     },
  lastEditedAt: { type: Date,   default: null  },
}, { timestamps: true });

TagSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('Tag', TagSchema);
