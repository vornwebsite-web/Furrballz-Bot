'use strict';

const { Schema, model } = require('mongoose');

const ShopItemSchema = new Schema({
  guildId:     { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: null  },
  price:       { type: Number, required: true },
  type:        { type: String, default: 'item', enum: ['item', 'role'] },
  roleId:      { type: String, default: null  }, // if type === 'role'
  stock:       { type: Number, default: -1    }, // -1 = unlimited
  sold:        { type: Number, default: 0     },
  enabled:     { type: Boolean,default: true  },
}, { timestamps: true });

ShopItemSchema.index({ guildId: 1, enabled: 1 });

module.exports = model('ShopItem', ShopItemSchema);
