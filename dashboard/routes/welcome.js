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

    // Welcome settings
    if (b.enabled    !== undefined) cfg.enabled   = b.enabled   === 'true';
    if (b.channelId  !== undefined) cfg.channelId = b.channelId || null;
    if (b.message    !== undefined) cfg.message   = b.message   || 'Welcome {user} to **{server}**!';
    if (b.dmMessage  !== undefined) cfg.dmMessage = b.dmMessage || null;
    if (b.roleId     !== undefined) cfg.roleId    = b.roleId    || null;

    // Invite log channel
    if (b.inviteLogChannelId !== undefined) guildDoc.inviteLogChannelId = b.inviteLogChannelId || null;

    // Boost settings
    if (b.boostChannelId !== undefined) guildDoc.boostChannelId = b.boostChannelId || null;
    if (b.boostRoleId    !== undefined) guildDoc.boostRoleId    = b.boostRoleId    || null;
    if (b.boostMessage   !== undefined) guildDoc.boostMessage   = b.boostMessage   || null;

    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
