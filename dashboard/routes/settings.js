'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const express = require('express');
const router  = express.Router();
const { requireAuth, requireGuildAccess } = require('./middleware');
const Guild = require('../../models/Guild');

// GET /guild/:guildId/settings
router.get('/:guildId/settings', requireAuth, requireGuildAccess, async (req, res, next) => {
  try {
    const roles    = req.guild.roles.cache
      .filter(r => !r.managed && r.id !== req.guild.id)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
      .sort((a, b) => b.position - a.position);

    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.render('settings', {
      title:    `Settings — ${req.guild.name}`,
      guild:    req.guild,
      guildDoc: req.guildDoc,
      roles,
      channels,
      pageSlug: 'settings',
    });
  } catch (err) { next(err); }
});

// POST /guild/:guildId/settings/general — save general settings
router.post('/:guildId/settings/general', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const b = req.body;

    if (b.prefix    !== undefined) guildDoc.prefix    = b.prefix    || '!';
    if (b.muteRoleId !== undefined) guildDoc.muteRoleId = b.muteRoleId || null;
    if (b.suggestionChannelId !== undefined) guildDoc.suggestionChannelId = b.suggestionChannelId || null;
    if (b.birthdayChannelId   !== undefined) guildDoc.birthdayChannelId   = b.birthdayChannelId   || null;
    if (b.birthdayRoleId      !== undefined) guildDoc.birthdayRoleId      = b.birthdayRoleId      || null;
    if (b.partnerChannelId    !== undefined) guildDoc.partnerChannelId    = b.partnerChannelId    || null;
    if (b.boostChannelId      !== undefined) guildDoc.boostChannelId      = b.boostChannelId      || null;
    if (b.boostMessage        !== undefined) guildDoc.boostMessage        = b.boostMessage        || null;

    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /guild/:guildId/settings/economy — save economy settings
router.post('/:guildId/settings/economy', requireAuth, requireGuildAccess, async (req, res) => {
  try {
    const { guildDoc } = req;
    const b = req.body;

    if (!guildDoc.economy) guildDoc.economy = {};
    if (b.enabled        !== undefined) guildDoc.economy.enabled        = b.enabled === 'true';
    if (b.currencyEmoji  !== undefined) guildDoc.economy.currencyEmoji  = b.currencyEmoji  || '🪙';
    if (b.dailyAmount    !== undefined) guildDoc.economy.dailyAmount    = parseInt(b.dailyAmount)    || 100;
    if (b.workMin        !== undefined) guildDoc.economy.workMin        = parseInt(b.workMin)        || 50;
    if (b.workMax        !== undefined) guildDoc.economy.workMax        = parseInt(b.workMax)        || 200;
    if (b.startingBalance !== undefined) guildDoc.economy.startingBalance = parseInt(b.startingBalance) || 0;

    guildDoc.markModified('economy');
    await guildDoc.save();
    res.json({ success: true });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// POST /guild/:guildId/settings/reset — reset entire guild config
router.post('/:guildId/settings/reset', requireAuth, requireGuildAccess, async (req, res) => {
  // Only guild owner can do a full reset
  if (req.guild.ownerId !== req.user.id) {
    return res.json({ success: false, error: 'Only the server owner can reset all settings.' });
  }
  try {
    const section = req.body.section;
    const { guildDoc } = req;

    const defaults = {
      welcome:   { enabled: false, channelId: null, message: 'Welcome {user} to **{server}**!', dmMessage: null, roleId: null },
      automod:   { enabled: false, filterInvites: false, filterLinks: false, filterCaps: false, filterMentions: false, bannedWords: [], action: 'delete', capsThreshold: 70, mentionLimit: 5, logChannelId: null, whitelist: { channels: [], roles: [] } },
      antispam:  { enabled: false, threshold: 5, interval: 5000, action: 'mute', whitelist: { channels: [], roles: [] } },
      leveling:  { enabled: true, xpMin: 15, xpMax: 40, xpCooldown: 60000, announceChannel: null },
      economy:   { enabled: true, currencyEmoji: '🪙', dailyAmount: 100, workMin: 50, workMax: 200, startingBalance: 0 },
      starboard: { enabled: false, channelId: null, threshold: 3, emoji: '⭐', ignoredChannels: [] },
      counting:  { enabled: false, channelId: null, count: 0, lastUserId: null, highscore: 0, resetCount: 0 },
      verify:    { enabled: false, channelId: null, roleId: null, message: null, logChannelId: null },
    };

    if (section && defaults[section]) {
      guildDoc[section] = defaults[section];
      guildDoc.markModified(section);
      await guildDoc.save();
      return res.json({ success: true, message: `${section} settings reset to defaults.` });
    }

    return res.json({ success: false, error: 'Unknown section.' });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

module.exports = router;
