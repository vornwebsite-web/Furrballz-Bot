'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express   = require('express');
const router    = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const AntiNuke  = require('../../models/AntiNuke');

// GET /guild/:guildId/antinuke
router.get('/:guildId/antinuke', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const cfg      = await AntiNuke.getOrCreate(req.guild.id);
    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.render('antinuke', {
      title:    `Anti-Nuke — ${req.guild.name}`,
      guild:    req.guild,
      cfg,
      channels,
      pageSlug: 'antinuke',
    });
  } catch (err) { next(err); }
});

// POST /guild/:guildId/antinuke — save config
router.post('/:guildId/antinuke', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = await AntiNuke.getOrCreate(req.guild.id);
    const b   = req.body;

    cfg.enabled      = b.enabled      === 'true';
    cfg.punishment   = b.punishment   || 'ban';
    cfg.logChannelId = b.logChannelId || null;
    cfg.windowSeconds = parseInt(b.windowSeconds) || 10;

    if (b.thresholds) {
      const t = typeof b.thresholds === 'string' ? JSON.parse(b.thresholds) : b.thresholds;
      Object.assign(cfg.thresholds, t);
      cfg.markModified('thresholds');
    } else {
      // Individual threshold fields from form
      const fields = ['channelCreate','channelDelete','roleCreate','roleDelete','ban','kick','webhookCreate','roleStrip'];
      fields.forEach(f => {
        if (b[f] !== undefined) cfg.thresholds[f] = parseInt(b[f]) || cfg.thresholds[f];
      });
      cfg.markModified('thresholds');
    }

    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /guild/:guildId/antinuke/whitelist — add user to whitelist
router.post('/:guildId/antinuke/whitelist', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg    = await AntiNuke.getOrCreate(req.guild.id);
    const userId = req.body.userId?.trim();
    if (!userId) return res.json({ success: false, error: 'No user ID provided.' });
    if (!cfg.whitelist.includes(userId)) {
      cfg.whitelist.push(userId);
      await cfg.save();
    }
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// DELETE /guild/:guildId/antinuke/whitelist/:userId — remove from whitelist
router.delete('/:guildId/antinuke/whitelist/:userId', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = await AntiNuke.getOrCreate(req.guild.id);
    cfg.whitelist = cfg.whitelist.filter(id => id !== req.params.userId);
    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
