'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, ActivityType } = require('discord.js');
const config    = require('../config');
const logger    = require('../utils/logger');
const BotConfig = require('../models/BotConfig');

// Services that run on intervals
const socialPoller       = require('../services/socialPoller');
const twitchPoller       = require('../services/twitchPoller');
const reminderService    = require('../services/reminderService');
const birthdayService    = require('../services/birthdayService');
const giveawayService    = require('../services/giveawayService');
const announceService    = require('../services/announceService');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    logger.info(`[Ready] Logged in as ${client.user.tag}`);
    logger.info(`[Ready] Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached users`);

    // ── Set presence from BotConfig ──────────────────────────────────────────
    try {
      const cfg = await BotConfig.get();
      const typeMap = {
        Playing:   ActivityType.Playing,
        Watching:  ActivityType.Watching,
        Listening: ActivityType.Listening,
        Competing: ActivityType.Competing,
        Streaming: ActivityType.Streaming,
      };

      client.user.setPresence({
        status: cfg.presenceStatus || 'online',
        activities: [{
          name: cfg.presenceText || 'TheFurrballz Hotel',
          type: typeMap[cfg.presenceType] ?? ActivityType.Watching,
          url:  cfg.presenceStreamUrl || undefined,
        }],
      });

      logger.info(`[Ready] Presence set — ${cfg.presenceType} ${cfg.presenceText}`);
    } catch (err) {
      logger.warn(`[Ready] Failed to set presence: ${err.message}`);
      // Fallback presence
      client.user.setActivity('TheFurrballz Hotel', { type: ActivityType.Watching });
    }

    // ── Start background service intervals ────────────────────────────────────
    socialPoller.start(client);
    twitchPoller.start(client);
    reminderService.start(client);
    birthdayService.start(client);
    giveawayService.startSweep(client);
    announceService.start(client);

    logger.info('[Ready] All background services started');
    logger.info(`[Ready] ${config.botName} v${config.botVersion} is fully operational`);
  },
};
