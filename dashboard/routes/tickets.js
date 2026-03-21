'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Ticket       = require('../../models/Ticket');
const TicketConfig = require('../../models/TicketConfig');

router.get('/:guildId/tickets', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const { guild } = req;
    const status    = req.query.status || 'open';
    const page      = parseInt(req.query.page) || 1;
    const limit     = 20;

    const [tickets, total, cfg] = await Promise.all([
      Ticket.find({ guildId: guild.id, status: status === 'all' ? { $exists: true } : status })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Ticket.countDocuments({ guildId: guild.id }),
      TicketConfig.getOrCreate(guild.id),
    ]);

    const channels = guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.render('tickets', {
      title:      `Tickets — ${guild.name}`,
      guild,
      tickets,
      total,
      cfg,
      channels,
      status,
      page,
      totalPages: Math.ceil(total / limit),
      pageSlug:   'tickets',
    });
  } catch (err) { next(err); }
});

// POST save ticket config
router.post('/:guildId/tickets/config', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const cfg = await TicketConfig.getOrCreate(req.guild.id);
    const { categoryId, logChannelId, maxOpenPerUser, panelTitle, panelDescription, autoCloseHours } = req.body;
    if (categoryId)       cfg.categoryId       = categoryId;
    if (logChannelId)     cfg.logChannelId     = logChannelId;
    if (maxOpenPerUser)   cfg.maxOpenPerUser   = parseInt(maxOpenPerUser);
    if (panelTitle)       cfg.panelTitle       = panelTitle;
    if (panelDescription) cfg.panelDescription = panelDescription;
    if (autoCloseHours !== undefined) cfg.autoCloseHours = parseInt(autoCloseHours);
    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
