'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Guild   = require('../../models/Guild');

router.get('/:guildId/logging', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.render('logging', {
      title:    `Logging — ${req.guild.name}`,
      guild:    req.guild,
      guildDoc: req.guildDoc,
      channels,
      pageSlug: 'logging',
    });
  } catch (err) { next(err); }
});

router.post('/:guildId/logging', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const { guildDoc } = req;
    const events = [
      'messageDelete','messageUpdate','memberJoin','memberLeave','memberUpdate',
      'banAdd','banRemove','channelCreate','channelDelete','channelUpdate',
      'roleCreate','roleDelete','roleUpdate','voiceUpdate','modAction','guildUpdate','inviteCreate',
    ];
    for (const event of events) {
      if (req.body[event] !== undefined) {
        guildDoc.logChannels[event] = req.body[event] || null;
      }
    }
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
