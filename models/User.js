'use strict';

const { Schema, model } = require('mongoose');

const inventoryItemSchema = new Schema({
  itemId:   { type: String, required: true },
  name:     { type: String, required: true },
  quantity: { type: Number, default: 1     },
}, { _id: false });

const UserSchema = new Schema({
  userId:        { type: String, required: true },
  guildId:       { type: String, required: true },
  xp:            { type: Number, default: 0     },
  level:         { type: Number, default: 0     },
  balance:       { type: Number, default: 0     },
  bank:          { type: Number, default: 0     },
  inventory:     { type: [inventoryItemSchema], default: [] },
  dailyCooldown: { type: Date,   default: null  },
  workCooldown:  { type: Date,   default: null  },
  xpCooldown:    { type: Date,   default: null  },
  afkMessage:    { type: String, default: null  },
  afkSince:      { type: Date,   default: null  },
  birthday:      { type: String, default: null  }, // "MM-DD" format
  totalMessages: { type: Number, default: 0     },
}, { timestamps: true });

UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });
UserSchema.index({ guildId: 1, xp: -1 });
UserSchema.index({ guildId: 1, balance: -1 });

/**
 * Gets or creates a user doc for a guild.
 */
UserSchema.statics.getOrCreate = async function (userId, guildId) {
  let user = await this.findOne({ userId, guildId });
  if (!user) user = await this.create({ userId, guildId });
  return user;
};

module.exports = model('User', UserSchema);
