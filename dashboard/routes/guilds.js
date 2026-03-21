'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

// GET /guilds — show guild picker
router.get('/', requireAuth, (req, res) => {
  const client     = req.app.locals.client;
  const userGuilds = req.user.guilds || [];

  // Guilds where user has Manage Server and bot is present
  const mutual = userGuilds
    .filter(g => {
      const hasPerms = (BigInt(g.permissions) & BigInt(0x20)) !== BigInt(0);
      const botIn    = client.guilds.cache.has(g.id);
      return hasPerms || botIn;
    })
    .map(g => ({
      ...g,
      botPresent: client.guilds.cache.has(g.id),
      icon:       g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
    }));

  res.render('guilds', { title: 'Select a Server', guilds: mutual, clientId: req.app.locals.client.user.id });
});

module.exports = router;
