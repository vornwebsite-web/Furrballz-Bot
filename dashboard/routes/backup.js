'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const { isOwner } = require('../../utils/permissions');
const Backup   = require('../../models/Backup');
const backupService = require('../../services/backupService');

// GET /guild/:guildId/backup
router.get('/:guildId/backup', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const backups = await Backup.find({ guildId: req.guild.id })
      .sort({ createdAt: -1 })
      .lean();

    res.render('backup', {
      title:    `Backup — ${req.guild.name}`,
      guild:    req.guild,
      backups,
      pageSlug: 'backup',
    });
  } catch (err) { next(err); }
});

// POST /guild/:guildId/backup/create — create a new backup
router.post('/:guildId/backup/create', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const backup = await backupService.create(
      req.guild,
      req.user.id,
      req.body.label || null,
    );
    res.json({ success: true, backupId: backup.backupId });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /guild/:guildId/backup/:backupId/load — restore a backup
router.post('/:guildId/backup/:backupId/load', requireAuth, requireGuildAccess, async (req, res) => {
  // Only server owner or bot owner can load a backup
  const isGuildOwner = req.guild.ownerId === req.user.id;
  if (!isGuildOwner && !isOwner(req.user.id)) {
    return res.json({ success: false, error: 'Only the server owner can restore a backup.' });
  }
  try {
    const deleteExisting = req.body.deleteExisting === 'true';
    const result = await backupService.load(req.guild, req.params.backupId, { deleteExisting });
    res.json(result);
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// GET /guild/:guildId/backup/:backupId/preview — diff preview
router.get('/:guildId/backup/:backupId/preview', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const diff = await backupService.preview(req.guild, req.params.backupId);
    if (!diff) return res.json({ success: false, error: 'Backup not found.' });
    res.json({ success: true, diff });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// DELETE /guild/:guildId/backup/:backupId — delete a backup
router.delete('/:guildId/backup/:backupId', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const doc = await Backup.findOneAndDelete({
      backupId: req.params.backupId,
      guildId:  req.guild.id,
    });
    if (!doc) return res.json({ success: false, error: 'Backup not found.' });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
