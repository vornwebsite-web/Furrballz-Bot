'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const { number, ordinal } = require('../utils/formatters');
const { paginate }      = require('../utils/paginator');
const Guild = require('../models/Guild');
const User  = require('../models/User');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Counting channel system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set the counting channel')
      .addChannelOption(o => o.setName('channel').setDescription('Counting channel').setRequired(true)))
    .addSubcommand(s => s.setName('disable').setDescription('Disable counting'))
    .addSubcommand(s => s.setName('reset').setDescription('Reset the count to 0'))
    .addSubcommand(s => s.setName('leaderboard').setDescription('Top counters (by messages)'))
    .addSubcommand(s => s.setName('stats').setDescription('View counting stats')),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.counting;

    if (sub === 'setup') {
      cfg.enabled   = true;
      cfg.channelId = interaction.options.getChannel('channel').id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Counting channel set to <#${cfg.channelId}>. Current count: **${cfg.count}**`)], ephemeral: true });
    }
    else if (sub === 'disable') { cfg.enabled = false; await guildDoc.save(); await interaction.reply({ embeds: [success('Counting disabled.')], ephemeral: true }); }
    else if (sub === 'reset') { cfg.count = 0; cfg.lastUserId = null; await guildDoc.save(); await interaction.reply({ embeds: [success('Count reset to **0**.')], ephemeral: true }); }
    else if (sub === 'leaderboard') {
      const top   = await User.find({ guildId: interaction.guild.id }).sort({ totalMessages: -1 }).limit(20);
      const lines = top.map((u, i) => `${ordinal(i + 1)}. <@${u.userId}> — ${number(u.totalMessages)} messages`);
      await paginate(interaction, [neutral(lines.join('\n') || 'No data.', 'Top Counters')]);
    }
    else if (sub === 'stats') {
      await interaction.reply({ embeds: [info([
        `**Enabled:** ${cfg.enabled}`,
        `**Channel:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'Not set'}`,
        `**Current count:** ${number(cfg.count)}`,
        `**Highscore:** ${number(cfg.highscore)}`,
        `**Times broken:** ${cfg.resetCount}`,
        `**Last broken by:** ${cfg.brokenBy ? `<@${cfg.brokenBy}>` : 'No one yet'}`,
      ].join('\n'), 'Counting Stats')], ephemeral: true });
    }
  },
};
