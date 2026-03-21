'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const TempVoice = require('../models/TempVoice');
const logger    = require('../utils/logger');

/**
 * Creates a temp voice channel when a member joins the trigger channel.
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildDoc
 * @param {import('discord.js').Client} client
 */
async function createChannel(member, guildDoc, client) {
  try {
    const category = guildDoc.tempVoiceCategoryId
      ? member.guild.channels.cache.get(guildDoc.tempVoiceCategoryId)
      : null;

    const channel = await member.guild.channels.create({
      name:   `${member.user.username}'s Channel`,
      type:   ChannelType.GuildVoice,
      parent: category || undefined,
      permissionOverwrites: [
        {
          id:    member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
          ],
        },
        {
          id:    member.guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
      ],
      reason: `[TempVoice] Created for ${member.user.tag}`,
    });

    await TempVoice.create({
      channelId: channel.id,
      guildId:   member.guild.id,
      ownerId:   member.id,
      name:      channel.name,
    });

    // Move member into the new channel
    await member.voice.setChannel(channel);

    logger.info(`[TempVoice] Created channel ${channel.id} for ${member.user.tag}`);
  } catch (err) {
    logger.warn(`[TempVoice] Create failed for ${member.user.tag}: ${err.message}`);
  }
}

/**
 * Checks if a temp voice channel is empty and deletes it if so.
 * @param {string} channelId
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 */
async function checkEmpty(channelId, guild, client) {
  const doc = await TempVoice.findOne({ channelId });
  if (!doc) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    await TempVoice.deleteOne({ channelId });
    return;
  }

  if (channel.members.size === 0) {
    try {
      await channel.delete('[TempVoice] Channel empty');
      await TempVoice.deleteOne({ channelId });
      logger.info(`[TempVoice] Deleted empty channel ${channelId}`);
    } catch (err) {
      logger.warn(`[TempVoice] Delete failed: ${err.message}`);
    }
  }
}

/**
 * Transfers ownership of a temp voice channel.
 * @param {string} channelId
 * @param {string} newOwnerId
 * @param {import('discord.js').Guild} guild
 */
async function transferOwnership(channelId, newOwnerId, guild) {
  const doc = await TempVoice.findOne({ channelId });
  if (!doc) return false;

  const channel   = guild.channels.cache.get(channelId);
  const newOwner  = guild.members.cache.get(newOwnerId);
  if (!channel || !newOwner) return false;

  const oldOwnerId = doc.ownerId;
  doc.ownerId      = newOwnerId;
  await doc.save();

  // Update permissions
  await channel.permissionOverwrites.edit(oldOwnerId, {
    ManageChannels: null,
    MoveMembers:    null,
  }).catch(() => {});

  await channel.permissionOverwrites.edit(newOwnerId, {
    ManageChannels: true,
    MoveMembers:    true,
    ViewChannel:    true,
    Connect:        true,
    Speak:          true,
  }).catch(() => {});

  return true;
}

module.exports = { createChannel, checkEmpty, transferOwnership };
