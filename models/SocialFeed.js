'use strict';

const { Schema, model } = require('mongoose');

const SocialFeedSchema = new Schema({
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  platform:    { type: String, required: true, enum: ['youtube', 'tiktok', 'instagram', 'twitch'] },
  handle:      { type: String, required: true },
  lastPostId:  { type: String, default: null  },
  paused:      { type: Boolean,default: false },
  pingRoleId:  { type: String, default: null  },
  message:     { type: String, default: null  }, // custom notification message
}, { timestamps: true });

SocialFeedSchema.index({ guildId: 1, platform: 1 });
SocialFeedSchema.index({ platform: 1, paused: 1 });

module.exports = model('SocialFeed', SocialFeedSchema);
