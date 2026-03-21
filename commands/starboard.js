'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Starboard configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set up the starboard')
      .addChannelOption(o => o.setName('channel').setDescription('Starboard channel').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Stars needed (default 3)').setMinValue(1).setMaxValue(50))
      .addStringOption(o => o.setName('emoji').setDescription('Star emoji (default ⭐)')))
    .addSubcommand(s => s.setName('disable').setDescription('Disable starboard'))
    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Change star threshold')
      .addIntegerOption(o => o.setName('count').setDescription('Stars needed').setRequired(true).setMinValue(1).setMaxValue(50)))
    .addSubcommand(s => s
      .setName('ignore')
      .setDescription('Ignore or unignore a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to toggle').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('View starboard configuration')),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.starboard;

    if (sub === 'setup') {
      cfg.enabled   = true;
      cfg.channelId = interaction.options.getChannel('channel').id;
      cfg.threshold = interaction.options.getInteger('threshold') || 3;
      cfg.emoji     = interaction.options.getString('emoji') || '⭐';
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Starboard enabled! Channel: <#${cfg.channelId}>, threshold: ${cfg.threshold} ${cfg.emoji}`)], ephemeral: true });
    }
    else if (sub === 'disable') { cfg.enabled = false; await guildDoc.save(); await interaction.reply({ embeds: [success('Starboard disabled.')], ephemeral: true }); }
    else if (sub === 'threshold') { cfg.threshold = interaction.options.getInteger('count'); await guildDoc.save(); await interaction.reply({ embeds: [success(`Threshold set to **${cfg.threshold}** stars.`)], ephemeral: true }); }
    else if (sub === 'ignore') {
      const ch = interaction.options.getChannel('channel');
      if (cfg.ignoredChannels.includes(ch.id)) { cfg.ignoredChannels = cfg.ignoredChannels.filter(id => id !== ch.id); await guildDoc.save(); await interaction.reply({ embeds: [success(`<#${ch.id}> removed from ignore list.`)], ephemeral: true }); }
      else { cfg.ignoredChannels.push(ch.id); await guildDoc.save(); await interaction.reply({ embeds: [success(`<#${ch.id}> added to ignore list.`)], ephemeral: true }); }
    }
    else if (sub === 'list') {
      await interaction.reply({ embeds: [info([`**Enabled:** ${cfg.enabled}`, `**Channel:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'Not set'}`, `**Threshold:** ${cfg.threshold} ${cfg.emoji}`, `**Ignored channels:** ${cfg.ignoredChannels.length}`].join('\n'), 'Starboard Config')], ephemeral: true });
    }
  },
};
