'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roleSnapshotSchema = new Schema({
  id:          { type: String, required: true },
  name:        { type: String, required: true },
  color:       { type: Number, default: 0     },
  hoist:       { type: Boolean,default: false },
  mentionable: { type: Boolean,default: false },
  permissions: { type: String, default: '0'  }, // bitfield as string
  position:    { type: Number, default: 0    },
  managed:     { type: Boolean,default: false },
}, { _id: false });

const overwriteSchema = new Schema({
  id:    { type: String, required: true },
  type:  { type: Number, required: true }, // 0 = role, 1 = member
  allow: { type: String, default: '0'   },
  deny:  { type: String, default: '0'   },
}, { _id: false });

const channelSnapshotSchema = new Schema({
  id:         { type: String, required: true },
  name:       { type: String, required: true },
  type:       { type: Number, required: true },
  position:   { type: Number, default: 0    },
  parentId:   { type: String, default: null },
  topic:      { type: String, default: null },
  nsfw:       { type: Boolean,default: false},
  rateLimitPerUser: { type: Number, default: 0 },
  bitrate:    { type: Number, default: null },
  userLimit:  { type: Number, default: 0   },
  permissionOverwrites: { type: [overwriteSchema], default: [] },
}, { _id: false });

const guildSettingsSchema = new Schema({
  name:                   { type: String, default: null },
  description:            { type: String, default: null },
  iconURL:                { type: String, default: null },
  verificationLevel:      { type: Number, default: 0   },
  defaultMessageNotifications: { type: Number, default: 0 },
  explicitContentFilter:  { type: Number, default: 0   },
  afkChannelId:           { type: String, default: null },
  afkTimeout:             { type: Number, default: 300  },
  systemChannelId:        { type: String, default: null },
}, { _id: false });

const BackupSchema = new Schema({
  backupId:  { type: String, default: () => uuidv4().slice(0, 8).toUpperCase(), unique: true },
  guildId:   { type: String, required: true },
  createdBy: { type: String, required: true },
  label:     { type: String, default: null  },
  roles:     { type: [roleSnapshotSchema],    default: [] },
  channels:  { type: [channelSnapshotSchema], default: [] },
  settings:  { type: guildSettingsSchema,     default: () => ({}) },
  // Schedule
  scheduledInterval: { type: String, default: null, enum: [null, 'daily', 'weekly'] },
}, { timestamps: true });

BackupSchema.index({ guildId: 1 });
BackupSchema.index({ backupId: 1 });

module.exports = model('Backup', BackupSchema);
