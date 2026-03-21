'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Guild      = require('../../models/Guild');
const Ticket     = require('../../models/Ticket');
const Warn       = require('../../models/Warn');
const User       = require('../../models/User');
const Giveaway   = require('../../models/Giveaway');
const SocialFeed = require('../../models/SocialFeed');
const AntiNuke   = require('../../models/AntiNuke');
const Backup     = require('../../models/Backup');
const BotConfig  = require('../../models/BotConfig');

// ── GET /api/guild/:guildId/stats — dashboard stats JSON ──────────────────────
router.get('/guild/:guildId/stats', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const client  = req.app.locals.client;
    const guildId = req.guild.id;

    const [openTickets, totalWarns, totalUsers, activeGiveaways] = await Promise.all([
      Ticket.countDocuments({ guildId, status: { $in: ['open', 'claimed'] } }),
      Warn.countDocuments({ guildId, active: true }),
      User.countDocuments({ guildId }),
      Giveaway.countDocuments({ guildId, ended: false }),
    ]);

    res.json({
      members:         req.guild.memberCount,
      channels:        req.guild.channels.cache.size,
      roles:           req.guild.roles.cache.size,
      openTickets,
      totalWarns,
      totalUsers,
      activeGiveaways,
      uptime:          Math.floor(process.uptime()),
      ping:            client.ws.ping,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/guild/:guildId/channels — text channels list ─────────────────────
router.get('/guild/:guildId/channels', requireAuth, requireGuildAccess, (req, res) => {
  const channels = req.guild.channels.cache
    .filter(c => c.isTextBased())
    .map(c => ({ id: c.id, name: c.name, type: c.type }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(channels);
});

// ── GET /api/guild/:guildId/roles — role list ─────────────────────────────────
router.get('/guild/:guildId/roles', requireAuth, requireGuildAccess, (req, res) => {
  const roles = req.guild.roles.cache
    .filter(r => !r.managed && r.id !== req.guild.id)
    .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
    .sort((a, b) => b.position - a.position);
  res.json(roles);
});

// ── GET /api/guild/:guildId/members — member search ──────────────────────────
router.get('/guild/:guildId/members', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const query   = (req.query.q || '').toLowerCase();
    const members = [...req.guild.members.cache.values()]
      .filter(m => m.user.username.toLowerCase().includes(query) || m.user.id.includes(query))
      .slice(0, 25)
      .map(m => ({ id: m.id, tag: m.user.tag, avatar: m.user.displayAvatarURL({ size: 32 }) }));
    res.json(members);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/guild/:guildId/antinuke — antinuke config ───────────────────────
router.get('/guild/:guildId/antinuke', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = await AntiNuke.getOrCreate(req.guild.id);
    res.json(cfg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/guild/:guildId/antinuke — save antinuke config ─────────────────
router.post('/guild/:guildId/antinuke', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const cfg = await AntiNuke.getOrCreate(req.guild.id);
    const b   = req.body;
    if (b.enabled     !== undefined) cfg.enabled     = b.enabled === true || b.enabled === 'true';
    if (b.punishment  !== undefined) cfg.punishment  = b.punishment;
    if (b.logChannelId !== undefined) cfg.logChannelId = b.logChannelId || null;
    if (b.thresholds  !== undefined) { Object.assign(cfg.thresholds, b.thresholds); cfg.markModified('thresholds'); }
    await cfg.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/guild/:guildId/backups — backup list ────────────────────────────
router.get('/guild/:guildId/backups', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const backups = await Backup.find({ guildId: req.guild.id }).sort({ createdAt: -1 }).lean();
    res.json(backups);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/guild/:guildId/backup — create backup ──────────────────────────
router.post('/guild/:guildId/backup', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const backupService = require('../../services/backupService');
    const backup        = await backupService.create(req.guild, req.user.id, req.body.label);
    res.json({ success: true, backupId: backup.backupId });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/bot/status — bot status JSON ─────────────────────────────────────
router.get('/bot/status', requireAuth, async (req, res) => {
  try {
    const client = req.app.locals.client;
    const cfg    = await BotConfig.get();
    res.json({
      status:       'online',
      mode:         cfg.mode,
      maintenance:  cfg.maintenance,
      guilds:       client.guilds.cache.size,
      users:        client.users.cache.size,
      uptime:       Math.floor(process.uptime()),
      ping:         client.ws.ping,
      memory:       (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
