'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Ticket  = require('../../models/Ticket');
const Warn    = require('../../models/Warn');
const User    = require('../../models/User');
const config  = require('../../config');

// GET /guild/:guildId
router.get('/:guildId', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const { guild, guildDoc } = req;
    const client = req.app.locals.client;

    const [openTickets, recentWarns, totalUsers] = await Promise.all([
      Ticket.countDocuments({ guildId: guild.id, status: { $in: ['open', 'claimed'] } }),
      Warn.find({ guildId: guild.id }).sort({ createdAt: -1 }).limit(5).lean(),
      User.countDocuments({ guildId: guild.id }),
    ]);

    const stats = {
      members:     guild.memberCount,
      channels:    guild.channels.cache.size,
      roles:       guild.roles.cache.size,
      openTickets,
      totalUsers,
      uptime:      Math.floor(process.uptime() / 60),
      commands:    client.commands.size,
    };

    res.render('overview', {
      title:       guild.name,
      guild,
      guildDoc,
      stats,
      recentWarns,
      page:        'overview',
    });
  } catch (err) { next(err); }
});

module.exports = router;
