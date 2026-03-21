'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');

router.get('/:guildId/roles', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const roles    = req.guild.roles.cache.filter(r => !r.managed && r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
    res.render('roles', { title: `Roles — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, roles, pageSlug: 'roles' });
  } catch (err) { next(err); }
});

router.post('/:guildId/roles', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const autoRoles    = req.body.autoRoles ? (Array.isArray(req.body.autoRoles) ? req.body.autoRoles : [req.body.autoRoles]) : [];
    guildDoc.autoRoles = autoRoles.filter(Boolean);
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
