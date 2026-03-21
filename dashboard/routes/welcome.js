'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

router.get('/:guildId/welcome', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    const roles    = req.guild.roles.cache.filter(r => !r.managed && r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name }));
    res.render('welcome', { title: `Welcome — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, channels, roles, pageSlug: 'welcome' });
  } catch (err) { next(err); }
});

router.post('/:guildId/welcome', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const cfg = guildDoc.welcome;
    const b   = req.body;
    cfg.enabled   = b.enabled   === 'true';
    cfg.channelId = b.channelId || null;
    cfg.message   = b.message   || 'Welcome {user} to **{server}**!';
    cfg.dmMessage = b.dmMessage || null;
    cfg.roleId    = b.roleId    || null;
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
