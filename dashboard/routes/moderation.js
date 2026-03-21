'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Warn    = require('../../models/Warn');
const Mute    = require('../../models/Mute');

// GET /guild/:guildId/moderation
router.get('/:guildId/moderation', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const { guild } = req;
    const page      = parseInt(req.query.page) || 1;
    const limit     = 20;
    const skip      = (page - 1) * limit;

    const [warns, warnTotal, mutes, bans] = await Promise.all([
      Warn.find({ guildId: guild.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Warn.countDocuments({ guildId: guild.id }),
      Mute.find({ guildId: guild.id, active: true }).lean(),
      guild.bans.fetch({ limit: 50 }).catch(() => new Map()),
    ]);

    res.render('moderation', {
      title:      `Moderation — ${guild.name}`,
      guild,
      warns,
      warnTotal,
      mutes,
      bans:       [...(bans.values ? bans.values() : [])],
      page,
      totalPages: Math.ceil(warnTotal / limit),
      pageSlug:   'moderation',
    });
  } catch (err) { next(err); }
});

// POST /guild/:guildId/moderation/clearwarn/:caseId
router.post('/:guildId/moderation/clearwarn/:caseId', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    await Warn.findOneAndUpdate({ caseId: req.params.caseId, guildId: req.guild.id }, { active: false });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
