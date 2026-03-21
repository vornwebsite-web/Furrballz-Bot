'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Schema, model } = require('mongoose');

const SuggestionSchema = new Schema({
  guildId:    { type: String, required: true },
  authorId:   { type: String, required: true },
  content:    { type: String, required: true },
  status:     { type: String, default: 'pending', enum: ['pending', 'approved', 'denied'] },
  upvotes:    { type: Number, default: 0 },
  downvotes:  { type: Number, default: 0 },
  // voters tracks who has voted to prevent double-voting
  voters:     { type: [String], default: [] },
  // messageId is the Discord message ID in the suggestion channel
  messageId:  { type: String, default: null },
  channelId:  { type: String, default: null },
  threadId:   { type: String, default: null },
  reviewerId: { type: String, default: null },
  reviewNote: { type: String, default: null },
}, { timestamps: true });

SuggestionSchema.index({ guildId: 1, status: 1 });
SuggestionSchema.index({ messageId: 1 });

module.exports = model('Suggestion', SuggestionSchema);
