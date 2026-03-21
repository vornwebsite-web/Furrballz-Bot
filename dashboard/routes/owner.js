'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express   = require('express');
const router    = express.Router();
const { requireOwner } = require('./middleware');
const BotConfig  = require('../../models/BotConfig');
const Blacklist  = require('../../models/Blacklist');

// GET /owner
router.get('/', requireOwner, async (req, res, next) => {
  try {
    const client    = req.app.locals.client;
    const cfg       = await BotConfig.get();
    const blacklist = await Blacklist.find().sort({ createdAt: -1 }).limit(50).lean();
    const guilds    = [...client.guilds.cache.values()].map(g => ({
      id:          g.id,
      name:        g.name,
      memberCount: g.memberCount,
      icon:        g.iconURL({ size: 64 }),
    }));

    res.render('owner', {
      title:     'Owner Panel',
      cfg,
      blacklist,
      guilds,
      uptime:    Math.floor(process.uptime()),
      memory:    (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      guildCount: client.guilds.cache.size,
      userCount:  client.users.cache.size,
    });
  } catch (err) { next(err); }
});

// POST /owner/mode
router.post('/mode', requireOwner, async (req, res) => {
  try {
    const cfg  = await BotConfig.get();
    cfg.mode   = req.body.mode === 'public' ? 'public' : 'private';
    await cfg.save();
    res.json({ success: true, mode: cfg.mode });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /owner/maintenance
router.post('/maintenance', requireOwner, async (req, res) => {
  try {
    const cfg         = await BotConfig.get();
    cfg.maintenance   = req.body.enabled === 'true';
    if (req.body.message) cfg.maintenanceMessage = req.body.message;
    await cfg.save();
    res.json({ success: true, maintenance: cfg.maintenance });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /owner/blacklist
router.post('/blacklist', requireOwner, async (req, res) => {
  try {
    const { targetId, targetType, reason } = req.body;
    const cfg = await BotConfig.get();
    await Blacklist.findOneAndUpdate(
      { targetId, targetType },
      { targetId, targetType, reason: reason || 'No reason', bannedBy: req.user.id },
      { upsert: true },
    );
    if (targetType === 'user'  && !cfg.blacklistedUsers.includes(targetId))  cfg.blacklistedUsers.push(targetId);
    if (targetType === 'guild' && !cfg.blacklistedGuilds.includes(targetId)) cfg.blacklistedGuilds.push(targetId);
    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// DELETE /owner/blacklist/:id
router.delete('/blacklist/:id', requireOwner, async (req, res) => {
  try {
    const doc = await Blacklist.findByIdAndDelete(req.params.id);
    if (doc) {
      const cfg = await BotConfig.get();
      cfg.blacklistedUsers  = cfg.blacklistedUsers.filter(id => id !== doc.targetId);
      cfg.blacklistedGuilds = cfg.blacklistedGuilds.filter(id => id !== doc.targetId);
      await cfg.save();
    }
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /owner/allowed-guild
router.post('/allowed-guild', requireOwner, async (req, res) => {
  try {
    const { guildId, action } = req.body;
    const cfg = await BotConfig.get();
    if (action === 'add' && !cfg.allowedGuilds.includes(guildId)) cfg.allowedGuilds.push(guildId);
    if (action === 'remove') cfg.allowedGuilds = cfg.allowedGuilds.filter(id => id !== guildId);
    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
