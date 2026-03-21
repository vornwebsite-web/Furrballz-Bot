'use strict';

const express    = require('express');
const router     = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Suggestion = require('../../models/Suggestion');

router.get('/:guildId/suggestions', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const docs   = await Suggestion.find({ guildId: req.guild.id, status }).sort({ createdAt: -1 }).limit(50).lean();
    res.render('suggestions', { title: `Suggestions — ${req.guild.name}`, guild: req.guild, docs, status, pageSlug: 'suggestions' });
  } catch (err) { next(err); }
});

router.post('/:guildId/suggestions/:id/:action', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const action = req.params.action;
    if (!['approve', 'deny'].includes(action)) return res.json({ success: false });
    await Suggestion.findOneAndUpdate(
      { _id: req.params.id, guildId: req.guild.id },
      { status: action === 'approve' ? 'approved' : 'denied', reviewerId: req.user.id },
    );
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
