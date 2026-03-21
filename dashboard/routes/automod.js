'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

router.get('/:guildId/automod', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const channels = req.guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name }));
    const roles    = req.guild.roles.cache.filter(r => !r.managed && r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name }));
    res.render('automod', { title: `Automod — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, channels, roles, pageSlug: 'automod' });
  } catch (err) { next(err); }
});

router.post('/:guildId/automod', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const cfg = guildDoc.automod;
    const b   = req.body;
    cfg.enabled        = b.enabled === 'true';
    cfg.filterInvites  = b.filterInvites  === 'true';
    cfg.filterLinks    = b.filterLinks    === 'true';
    cfg.filterCaps     = b.filterCaps     === 'true';
    cfg.filterMentions = b.filterMentions === 'true';
    cfg.capsThreshold  = parseInt(b.capsThreshold)  || 70;
    cfg.mentionLimit   = parseInt(b.mentionLimit)   || 5;
    cfg.action         = b.action    || 'delete';
    cfg.logChannelId   = b.logChannelId || null;
    if (b.bannedWords) cfg.bannedWords = b.bannedWords.split('\n').map(w => w.trim()).filter(Boolean);
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
