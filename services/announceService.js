'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const logger = require('../utils/logger');
const config = require('../config');

// In-memory scheduled announcements: Map<id, { guildId, channelId, content, embeds, fireAt, timeoutId }>
const scheduled = new Map();
let   nextId    = 1;

/**
 * Starts the announce service — re-checks scheduled items every minute.
 * @param {import('discord.js').Client} client
 */
function start(client) {
  setInterval(() => checkScheduled(client), 60 * 1000);
  logger.info('[AnnounceService] Started');
}

/**
 * Schedules an announcement to fire at a specific time.
 * @param {object} options
 * @param {string}   options.guildId
 * @param {string}   options.channelId
 * @param {string}   [options.content]
 * @param {Array}    [options.embeds]
 * @param {Date}     options.fireAt
 * @param {import('discord.js').Client} client
 * @returns {number} Announcement ID
 */
function schedule(options, client) {
  const id    = nextId++;
  const delay = options.fireAt.getTime() - Date.now();

  if (delay <= 0) {
    // Fire immediately
    fire(options, client);
    return id;
  }

  const timeoutId = setTimeout(() => {
    fire(options, client);
    scheduled.delete(id);
  }, Math.min(delay, 2147483647)); // clamp to max setTimeout value

  scheduled.set(id, { ...options, timeoutId });
  logger.info(`[AnnounceService] Scheduled announcement ${id} in ${Math.round(delay / 1000)}s`);
  return id;
}

/**
 * Cancels a scheduled announcement.
 * @param {number} id
 * @returns {boolean} Whether the announcement was found and cancelled
 */
function cancel(id) {
  const entry = scheduled.get(id);
  if (!entry) return false;
  clearTimeout(entry.timeoutId);
  scheduled.delete(id);
  logger.info(`[AnnounceService] Cancelled announcement ${id}`);
  return true;
}

/**
 * Edits a scheduled announcement's content.
 * @param {number} id
 * @param {object} updates - { content?, embeds? }
 * @returns {boolean}
 */
function edit(id, updates) {
  const entry = scheduled.get(id);
  if (!entry) return false;
  if (updates.content !== undefined) entry.content = updates.content;
  if (updates.embeds  !== undefined) entry.embeds  = updates.embeds;
  scheduled.set(id, entry);
  return true;
}

/**
 * Lists all pending scheduled announcements for a guild.
 * @param {string} guildId
 * @returns {Array}
 */
function list(guildId) {
  return [...scheduled.entries()]
    .filter(([, v]) => v.guildId === guildId)
    .map(([id, v]) => ({ id, channelId: v.channelId, fireAt: v.fireAt, content: v.content?.slice(0, 100) }));
}

/**
 * Fires an announcement immediately.
 */
async function fire(options, client) {
  try {
    const channel = await client.channels.fetch(options.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send({
      content: options.content   || undefined,
      embeds:  options.embeds    || [],
      allowedMentions: { parse: ['roles', 'everyone', 'users'] },
    });
  } catch (err) {
    logger.warn(`[AnnounceService] Fire failed: ${err.message}`);
  }
}

/**
 * Re-fires any overdue announcements (e.g. if bot restarted).
 */
async function checkScheduled(client) {
  const now = Date.now();
  for (const [id, entry] of scheduled) {
    if (entry.fireAt.getTime() <= now) {
      await fire(entry, client);
      clearTimeout(entry.timeoutId);
      scheduled.delete(id);
    }
  }
}

module.exports = { start, schedule, cancel, edit, list, fire };
