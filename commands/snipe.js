'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { info, neutral, error } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');
const { relativeTime } = require('../utils/formatters');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Snipe system for deleted and edited messages')

    .addSubcommand(s => s
      .setName('deleted')
      .setDescription('Show the last deleted message in this channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to snipe (defaults to current)')))

    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Clear the snipe cache for this channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to clear'))),

  async execute(interaction, client) {
    const sub     = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (sub === 'deleted') {
      const cached = client.snipeCache?.get(channel.id);
      if (!cached) return errorReply(interaction, `No recently deleted messages in <#${channel.id}>.`);

      const embed = info(
        cached.content || '*[No text content]*',
        `🗑️ Deleted message in #${channel.name}`,
      );

      if (cached.authorId) embed.setAuthor({ name: cached.authorTag || 'Unknown', iconURL: null });
      if (cached.imageUrl) embed.setImage(cached.imageUrl);
      embed.setFooter({ text: `Deleted ${relativeTime(cached.deletedAt)} • Author: ${cached.authorTag || 'Unknown'}` });

      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'clear') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      client.snipeCache?.delete(channel.id);
      await interaction.reply({ embeds: [info(`Snipe cache cleared for <#${channel.id}>.`)], ephemeral: true });
    }
  },
};
