'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const ShopItem = require('../../models/ShopItem');
const User     = require('../../models/User');

router.get('/:guildId/economy', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const [items, topUsers] = await Promise.all([
      ShopItem.find({ guildId: req.guild.id }).lean(),
      User.find({ guildId: req.guild.id }).sort({ balance: -1 }).limit(20).lean(),
    ]);
    const roles = req.guild.roles.cache.filter(r => !r.managed && r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name }));
    res.render('economy', { title: `Economy — ${req.guild.name}`, guild: req.guild, guildDoc: req.guildDoc, items, topUsers, roles, pageSlug: 'economy' });
  } catch (err) { next(err); }
});

router.post('/:guildId/economy/item', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { name, price, type, description, roleId, stock } = req.body;
    await ShopItem.create({ guildId: req.guild.id, name, price: parseInt(price), type, description: description || null, roleId: roleId || null, stock: parseInt(stock) || -1 });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.delete('/:guildId/economy/item/:id', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    await ShopItem.deleteOne({ _id: req.params.id, guildId: req.guild.id });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

router.post('/:guildId/economy/balance/:userId', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    await User.findOneAndUpdate({ userId: req.params.userId, guildId: req.guild.id }, { balance: amount }, { upsert: true });
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
