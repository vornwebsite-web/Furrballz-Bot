'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const InviteCache = require('../models/InviteCache');

module.exports = {
  name: Events.InviteDelete,

  async execute(invite) {
    if (!invite.guild) return;
    try {
      await InviteCache.deleteOne({ inviteCode: invite.code });
    } catch { /* ignore */ }
  },
};
