'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, error } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const tempVoiceService = require('../services/tempVoiceService');
const TempVoice = require('../models/TempVoice');
const Guild     = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('tempvc')
    .setDescription('Temporary voice channel system')

    // Setup (admin)
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set up the temp VC trigger channel')
      .addChannelOption(o => o.setName('trigger').setDescription('Join this channel to create a temp VC').setRequired(true))
      .addChannelOption(o => o.setName('category').setDescription('Category to create temp VCs in')))

    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable temp voice channels'))

    // Owner controls
    .addSubcommand(s => s
      .setName('rename')
      .setDescription('Rename your temp VC')
      .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true).setMaxLength(100)))

    .addSubcommand(s => s
      .setName('limit')
      .setDescription('Set user limit for your temp VC')
      .addIntegerOption(o => o.setName('limit').setDescription('Max users (0 = unlimited)').setRequired(true).setMinValue(0).setMaxValue(99)))

    .addSubcommand(s => s
      .setName('lock')
      .setDescription('Lock your temp VC (no one can join without invite)'))

    .addSubcommand(s => s
      .setName('unlock')
      .setDescription('Unlock your temp VC'))

    .addSubcommand(s => s
      .setName('transfer')
      .setDescription('Transfer ownership of your temp VC')
      .addUserOption(o => o.setName('user').setDescription('New owner').setRequired(true)))

    .addSubcommand(s => s
      .setName('kick')
      .setDescription('Kick a user from your temp VC')
      .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true)))

    .addSubcommand(s => s
      .setName('info')
      .setDescription('View info about your current temp VC')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // Admin setup commands
    if (sub === 'setup') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const trigger  = interaction.options.getChannel('trigger');
      const category = interaction.options.getChannel('category');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.tempVoiceTriggerChannelId = trigger.id;
      guildDoc.tempVoiceCategoryId       = category?.id || null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Temp VC trigger set to **${trigger.name}**.\nJoin that channel to create your own voice channel.`)], ephemeral: true });
      return;
    }

    if (sub === 'disable') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.tempVoiceTriggerChannelId = null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success('Temp VC system disabled.')], ephemeral: true });
      return;
    }

    // Find user's temp VC
    const vcDoc = await TempVoice.findOne({ guildId: interaction.guild.id, ownerId: interaction.user.id });
    if (!vcDoc) return errorReply(interaction, 'You don\'t own a temp voice channel. Join the trigger channel to create one.');

    const channel = interaction.guild.channels.cache.get(vcDoc.channelId);
    if (!channel) {
      await TempVoice.deleteOne({ _id: vcDoc._id });
      return errorReply(interaction, 'Your temp VC no longer exists.');
    }

    if (sub === 'rename') {
      const name = interaction.options.getString('name');
      await channel.setName(name);
      vcDoc.name = name;
      await vcDoc.save();
      await interaction.reply({ embeds: [success(`Your channel has been renamed to **${name}**.`)], ephemeral: true });
    }

    else if (sub === 'limit') {
      const limit = interaction.options.getInteger('limit');
      await channel.setUserLimit(limit);
      vcDoc.userLimit = limit;
      await vcDoc.save();
      await interaction.reply({ embeds: [success(`User limit set to **${limit === 0 ? 'Unlimited' : limit}**.`)], ephemeral: true });
    }

    else if (sub === 'lock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
      vcDoc.locked = true;
      await vcDoc.save();
      await interaction.reply({ embeds: [success('Your voice channel has been **locked**. Only allowed users can join.')], ephemeral: true });
    }

    else if (sub === 'unlock') {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
      vcDoc.locked = false;
      await vcDoc.save();
      await interaction.reply({ embeds: [success('Your voice channel has been **unlocked**.')], ephemeral: true });
    }

    else if (sub === 'transfer') {
      const newOwner = interaction.options.getMember('user');
      if (!newOwner) return errorReply(interaction, 'User not found.');
      if (newOwner.id === interaction.user.id) return errorReply(interaction, 'You already own this channel.');
      const ok = await tempVoiceService.transferOwnership(vcDoc.channelId, newOwner.id, interaction.guild);
      if (!ok) return errorReply(interaction, 'Transfer failed.');
      await interaction.reply({ embeds: [success(`Ownership transferred to <@${newOwner.id}>.`)], ephemeral: true });
    }

    else if (sub === 'kick') {
      const target = interaction.options.getMember('user');
      if (!target) return errorReply(interaction, 'User not found.');
      if (target.voice?.channelId !== vcDoc.channelId) return errorReply(interaction, 'That user is not in your voice channel.');
      await target.voice.disconnect('Kicked from temp VC');
      await interaction.reply({ embeds: [success(`<@${target.id}> has been kicked from your voice channel.`)], ephemeral: true });
    }

    else if (sub === 'info') {
      const members = channel.members;
      await interaction.reply({
        embeds: [info([
          `**Channel:** <#${channel.id}>`,
          `**Owner:** <@${vcDoc.ownerId}>`,
          `**Members:** ${members.size}${vcDoc.userLimit > 0 ? ` / ${vcDoc.userLimit}` : ''}`,
          `**Locked:** ${vcDoc.locked ? 'Yes' : 'No'}`,
          `**Created:** <t:${Math.floor(vcDoc.createdAt.getTime() / 1000)}:R>`,
        ].join('\n'), 'Your Temp Voice Channel')],
        ephemeral: true,
      });
    }
  },
};
