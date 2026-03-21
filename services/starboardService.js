'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const Starboard  = require('../models/Starboard');
const { buildEmbed } = require('../utils/embedBuilder');
const logger     = require('../utils/logger');

/**
 * Handles a star reaction being added.
 * @param {import('discord.js').MessageReaction} reaction
 * @param {object} guildDoc - Mongoose Guild document
 * @param {import('discord.js').Client} client
 */
async function handleReaction(reaction, guildDoc, client) {
  const cfg = guildDoc.starboard;
  if (!cfg?.enabled || !cfg.channelId) return;
  if (cfg.ignoredChannels?.includes(reaction.message.channel.id)) return;

  const message   = reaction.message;
  const starCount = reaction.count;

  // Don't star bots or the starboard channel itself
  if (message.author?.bot) return;
  if (message.channel.id === cfg.channelId) return;

  let entry = await Starboard.findOne({ originalMsgId: message.id });

  if (!entry) {
    if (starCount < (cfg.threshold ?? 3)) return;

    // Create new starboard entry
    entry = await Starboard.create({
      guildId:            message.guild.id,
      originalMsgId:      message.id,
      originalChannelId:  message.channel.id,
      starboardChannelId: cfg.channelId,
      authorId:           message.author.id,
      stars:              starCount,
      starredBy:          [...reaction.users.cache.keys()],
    });

    // Post to starboard channel
    const starChannel = await client.channels.fetch(cfg.channelId).catch(() => null);
    if (!starChannel?.isTextBased()) return;

    const embed = buildStarboardEmbed(message, starCount, cfg.emoji || '⭐');
    const sent  = await starChannel.send({ embeds: [embed] });

    entry.starboardMsgId = sent.id;
    await entry.save();
  } else {
    // Update existing entry
    entry.stars     = starCount;
    entry.starredBy = [...new Set([...entry.starredBy, ...reaction.users.cache.keys()])];
    await entry.save();
    await updateStarboardMessage(entry, starCount, cfg.emoji || '⭐', client);
  }
}

/**
 * Handles a star reaction being removed.
 */
async function handleUnreaction(reaction, guildDoc, client) {
  const cfg = guildDoc.starboard;
  if (!cfg?.enabled) return;

  const message = reaction.message;
  const entry   = await Starboard.findOne({ originalMsgId: message.id });
  if (!entry) return;

  const newCount = reaction.count;
  entry.stars    = newCount;
  await entry.save();

  await updateStarboardMessage(entry, newCount, cfg.emoji || '⭐', client);
}

/**
 * Updates the star count on an existing starboard message.
 */
async function updateStarboardMessage(entry, starCount, emoji, client) {
  if (!entry.starboardMsgId) return;
  try {
    const channel = await client.channels.fetch(entry.starboardChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const msg = await channel.messages.fetch(entry.starboardMsgId).catch(() => null);
    if (!msg) return;

    const originalChannel = await client.channels.fetch(entry.originalChannelId).catch(() => null);
    const originalMsg     = await originalChannel?.messages.fetch(entry.originalMsgId).catch(() => null);

    if (originalMsg) {
      const embed = buildStarboardEmbed(originalMsg, starCount, emoji);
      await msg.edit({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn(`[StarboardService] Update failed: ${err.message}`);
  }
}

function buildStarboardEmbed(message, starCount, emoji) {
  const embed = buildEmbed({
    type:        'warning',
    description: message.content?.slice(0, 2000) || null,
    fields: [
      { name: 'Source', value: `[Jump to message](${message.url})`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
    ],
  });

  embed.setAuthor({
    name:    message.author.tag,
    iconURL: message.author.displayAvatarURL(),
  });

  const image = message.attachments.find(a => a.contentType?.startsWith('image/'));
  if (image) embed.setImage(image.url);

  embed.setFooter({ text: `${emoji} ${starCount} star${starCount !== 1 ? 's' : ''}` });

  return embed;
}

module.exports = { handleReaction, handleUnreaction };
