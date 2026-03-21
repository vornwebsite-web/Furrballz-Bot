'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

router.get('/:guildId/starboard', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    res.render('starboard', { title: `Starboard — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, channels, pageSlug: 'starboard' });
  } catch (err) { next(err); }
});

router.post('/:guildId/starboard', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = req.guildDoc.starboard;
    const b   = req.body;
    cfg.enabled   = b.enabled   === 'true';
    cfg.channelId = b.channelId || null;
    cfg.threshold = parseInt(b.threshold) || 3;
    cfg.emoji     = b.emoji || '⭐';
    await req.guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
