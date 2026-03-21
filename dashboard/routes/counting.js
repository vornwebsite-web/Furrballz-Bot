'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

router.get('/:guildId/counting', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    res.render('counting', { title: `Counting — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, channels, pageSlug: 'counting' });
  } catch (err) { next(err); }
});

router.post('/:guildId/counting', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = req.guildDoc.counting;
    cfg.enabled   = req.body.enabled === 'true';
    cfg.channelId = req.body.channelId || null;
    await req.guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.post('/:guildId/counting/reset', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    req.guildDoc.counting.count      = 0;
    req.guildDoc.counting.lastUserId = null;
    await req.guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
