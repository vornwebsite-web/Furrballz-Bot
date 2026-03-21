'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply }    = require('../utils/errors');
const { relativeTime }  = require('../utils/formatters');
const User = require('../models/User');

module.exports = {
  cooldown: 5000,
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('AFK status system')
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set yourself as AFK')
      .addStringOption(o => o.setName('message').setDescription('AFK reason').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove your AFK status'))
    .addSubcommand(s => s
      .setName('status')
      .setDescription('Check a user\'s AFK status')
      .addUserOption(o => o.setName('user').setDescription('User to check'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const message = interaction.options.getString('message') || 'AFK';
      const user    = await User.getOrCreate(interaction.user.id, interaction.guild.id);
      user.afkMessage = message;
      user.afkSince   = new Date();
      await user.save();
      await interaction.reply({ embeds: [success(`You are now AFK: **${message}**`)], ephemeral: true });
    }

    else if (sub === 'remove') {
      const user = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!user?.afkMessage) return errorReply(interaction, 'You are not AFK.');
      user.afkMessage = null;
      user.afkSince   = null;
      await user.save();
      await interaction.reply({ embeds: [success('Your AFK status has been removed.')], ephemeral: true });
    }

    else if (sub === 'status') {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
      if (!user?.afkMessage) return interaction.reply({ embeds: [info(`**${target.username}** is not AFK.`)], ephemeral: true });
      await interaction.reply({ embeds: [info(`**${target.username}** is AFK: **${user.afkMessage}**\nSince: ${relativeTime(user.afkSince)}`)], ephemeral: true });
    }
  },
};
