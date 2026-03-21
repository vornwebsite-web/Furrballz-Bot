'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const { getLeaderboard } = require('../../services/levelService');
const User = require('../../models/User');

router.get('/:guildId/levels', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const [leaderboard, channels, roles] = await Promise.all([
      getLeaderboard(req.guild.id, 20),
      Promise.resolve(req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }))),
      Promise.resolve(req.guild.roles.cache.filter(r => !r.managed && r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name }))),
    ]);
    res.render('levels', { title: `Levels — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, leaderboard, channels, roles, pageSlug: 'levels' });
  } catch (err) { next(err); }
});

router.post('/:guildId/levels', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const cfg = guildDoc.leveling;
    const b   = req.body;
    cfg.enabled          = b.enabled === 'true';
    cfg.announceChannel  = b.announceChannel || null;
    cfg.xpMin            = parseInt(b.xpMin) || 15;
    cfg.xpMax            = parseInt(b.xpMax) || 40;
    cfg.xpCooldown       = parseInt(b.xpCooldown) || 60000;
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.post('/:guildId/levels/reset/:userId', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    await User.findOneAndUpdate({ userId: req.params.userId, guildId: req.guild.id }, { xp: 0, level: 0 });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
