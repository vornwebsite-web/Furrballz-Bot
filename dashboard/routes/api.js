'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// GET /auth/discord — redirect to Discord OAuth
router.get('/discord', passport.authenticate('discord'));

// GET /auth/callback — handle OAuth callback
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    res.redirect('/guilds');
  },
);

// GET /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

module.exports = router;
