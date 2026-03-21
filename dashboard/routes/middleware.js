'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { isOwner }  = require('../../utils/permissions');
const Guild        = require('../../models/Guild');

/**
 * Require the user to be logged in.
 */
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/?error=not_logged_in');
  next();
}

/**
 * Require the user to be the bot owner.
 */
function requireOwner(req, res, next) {
  if (!req.user) return res.redirect('/');
  if (!isOwner(req.user.id)) return res.status(403).render('error', { title: 'Forbidden', message: 'Owner only.' });
  next();
}

/**
 * Require the user to have Manage Server in the target guild,
 * and the bot to be present in that guild.
 * Attaches req.guild (Discord guild) and req.guildDoc (Mongoose doc).
 */
async function requireGuildAccess(req, res, next) {
  if (!req.user) return res.redirect('/');

  const guildId = req.params.guildId || req.params.id;
  const client  = req.app.locals.client;

  const discordGuild = client.guilds.cache.get(guildId);
  if (!discordGuild) {
    return res.status(404).render('error', { title: 'Not Found', message: 'Bot is not in this server.' });
  }

  // Check user has Manage Server in this guild
  const userGuild = (req.user.guilds || []).find(g => g.id === guildId);
  const hasPerms  = userGuild && ((BigInt(userGuild.permissions) & BigInt(0x20)) !== BigInt(0));
  const isGuildOwner = discordGuild.ownerId === req.user.id;

  if (!hasPerms && !isGuildOwner && !isOwner(req.user.id)) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'You need Manage Server permission.' });
  }

  try {
    const guildDoc = await Guild.getOrCreate(guildId);
    req.guild    = discordGuild;
    req.guildDoc = guildDoc;
    res.locals.guild    = discordGuild;
    res.locals.guildDoc = guildDoc;
    res.locals.guildId  = guildId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireOwner, requireGuildAccess };
