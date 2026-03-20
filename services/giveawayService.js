'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const Giveaway   = require('../models/Giveaway');
const { buildEmbed } = require('../utils/embedBuilder');
const { single }     = require('../utils/buttonBuilder');
const { ButtonStyle } = require('discord.js');
const logService  = require('./logService');
const logger      = require('../utils/logger');
const config      = require('../config');

/**
 * Starts the giveaway sweep interval — checks for ended giveaways every 15s.
 * @param {import('discord.js').Client} client
 */
function startSweep(client) {
  setInterval(() => sweepEnded(client), 15000);
  logger.info('[GiveawayService] Sweep interval started');
}

/**
 * Checks for giveaways that have passed their end time and ends them.
 */
async function sweepEnded(client) {
  try {
    const ended = await Giveaway.find({
      ended:  false,
      paused: false,
      endsAt: { $lte: new Date() },
    });

    for (const giveaway of ended) {
      await endGiveaway(giveaway, client);
    }
  } catch (err) {
    logger.error(`[GiveawayService] Sweep error: ${err.message}`);
  }
}

/**
 * Picks winners and marks a giveaway as ended.
 * @param {object} giveaway - Mongoose Giveaway document
 * @param {import('discord.js').Client} client
 * @returns {Promise<string[]>} Winner user IDs
 */
async function endGiveaway(giveaway, client) {
  if (giveaway.ended) return [];

  giveaway.ended = true;

  const winnerIds = pickWinners(giveaway.entries, giveaway.winnersCount);
  giveaway.winners = winnerIds;
  await giveaway.save();

  // Update the giveaway message
  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return winnerIds;

    const embed = buildEmbed({
      type:        'neutral',
      title:       `🎉 Giveaway Ended — ${giveaway.prize}`,
      description: winnerIds.length > 0
        ? `**Winner(s):** ${winnerIds.map(id => `<@${id}>`).join(', ')}`
        : '**No valid entries.** No winner was drawn.',
      fields: [
        { name: 'Entries',  value: String(giveaway.entries.length), inline: true },
        { name: 'Hosted by', value: `<@${giveaway.hostId}>`, inline: true },
      ],
    });

    if (giveaway.messageId) {
      const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [embed], components: [] });
    }

    if (winnerIds.length > 0) {
      await channel.send({
        content: `🎉 Congratulations ${winnerIds.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`,
        allowedMentions: { users: winnerIds },
      });
    }
  } catch (err) {
    logger.warn(`[GiveawayService] End message update failed: ${err.message}`);
  }

  return winnerIds;
}

/**
 * Creates and posts a new giveaway.
 */
async function createGiveaway(channel, options, client) {
  const { prize, winnersCount, duration, hostId, requirements } = options;
  const endsAt = new Date(Date.now() + duration);

  const embed = buildEmbed({
    type:        'primary',
    title:       `🎉 Giveaway — ${prize}`,
    description: `React with 🎉 or click the button to enter!\n\n**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n**Hosted by:** <@${hostId}>\n**Winners:** ${winnersCount}`,
    fields:      requirements?.roleId ? [{ name: 'Required Role', value: `<@&${requirements.roleId}>`, inline: true }] : [],
  });

  const row = single('giveaway_enter', '🎉 Enter', ButtonStyle.Primary);
  const msg = await channel.send({ embeds: [embed], components: [row] });

  const giveaway = await Giveaway.create({
    guildId:      channel.guild.id,
    channelId:    channel.id,
    messageId:    msg.id,
    hostId,
    prize,
    winnersCount: winnersCount || 1,
    endsAt,
    requirements: requirements || {},
  });

  return giveaway;
}

/**
 * Picks random winners from the entries array.
 */
function pickWinners(entries, count) {
  if (!entries || entries.length === 0) return [];
  const pool    = [...new Set(entries)]; // deduplicate
  const winners = [];
  const max     = Math.min(count, pool.length);
  while (winners.length < max) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

/**
 * Rerolls winners for an ended giveaway.
 */
async function reroll(giveaway, client, count = 1) {
  const newWinners = pickWinners(
    giveaway.entries.filter(id => !giveaway.winners.includes(id)),
    count,
  );

  if (newWinners.length === 0) return [];

  giveaway.winners.push(...newWinners);
  await giveaway.save();

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel) {
      await channel.send({
        content: `🔁 Reroll! New winner(s): ${newWinners.map(id => `<@${id}>`).join(', ')}! Congratulations!`,
        allowedMentions: { users: newWinners },
      });
    }
  } catch { /* ignore */ }

  return newWinners;
}

module.exports = { startSweep, endGiveaway, createGiveaway, pickWinners, reroll };
