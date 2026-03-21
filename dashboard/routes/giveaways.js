'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Giveaway = require('../../models/Giveaway');

router.get('/:guildId/giveaways', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const tab      = req.query.tab || 'active';
    const [active, ended] = await Promise.all([
      Giveaway.find({ guildId: req.guild.id, ended: false }).sort({ endsAt: 1 }).lean(),
      Giveaway.find({ guildId: req.guild.id, ended: true  }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    res.render('giveaways', { title: `Giveaways — ${req.guild.name}`, guild: req.guild, active, ended, channels, tab, pageSlug: 'giveaways' });
  } catch (err) { next(err); }
});

router.post('/:guildId/giveaways/:id/end', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const giveaway = await Giveaway.findOne({ _id: req.params.id, guildId: req.guild.id });
    if (!giveaway) return res.json({ success: false });
    giveaway.endsAt = new Date();
    await giveaway.save();
    const { endGiveaway } = require('../../services/giveawayService');
    await endGiveaway(giveaway, req.app.locals.client);
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.post('/:guildId/giveaways/:id/reroll', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const giveaway = await Giveaway.findOne({ _id: req.params.id, guildId: req.guild.id, ended: true });
    if (!giveaway) return res.json({ success: false });
    const { reroll } = require('../../services/giveawayService');
    const winners = await reroll(giveaway, req.app.locals.client);
    res.json({ success: true, winners });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
