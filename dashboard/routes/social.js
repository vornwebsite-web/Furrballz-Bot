'use strict';

const express    = require('express');
const router     = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const SocialFeed = require('../../models/SocialFeed');

router.get('/:guildId/social', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const feeds = await SocialFeed.find({ guildId: req.guild.id }).lean();
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    res.render('social', { title: `Social — ${req.guild.name}`, guild: req.guild, feeds, channels, pageSlug: 'social' });
  } catch (err) { next(err); }
});

router.post('/:guildId/social/pause/:id', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const feed = await SocialFeed.findOne({ _id: req.params.id, guildId: req.guild.id });
    if (!feed) return res.json({ success: false, error: 'Not found' });
    feed.paused = !feed.paused;
    await feed.save();
    res.json({ success: true, paused: feed.paused });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.delete('/:guildId/social/:id', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    await SocialFeed.deleteOne({ _id: req.params.id, guildId: req.guild.id });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
