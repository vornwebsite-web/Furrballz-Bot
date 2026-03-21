'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Manage channel slowmode')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set slowmode in a channel')
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 5s, 30s, 1m, 6h (0 to disable)').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')))

    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable slowmode in a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')))

    .addSubcommand(s => s
      .setName('view')
      .setDescription('View current slowmode in a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')))

    .addSubcommand(s => s
      .setName('preset')
      .setDescription('Apply a slowmode preset')
      .addStringOption(o => o.setName('preset').setDescription('Preset to apply').setRequired(true)
        .addChoices(
          { name: 'Low (5s)',    value: '5'    },
          { name: 'Medium (30s)',value: '30'   },
          { name: 'High (1m)',   value: '60'   },
          { name: 'Very High (5m)', value: '300' },
          { name: 'Max (6h)',    value: '21600'},
        ))
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)'))),

  async execute(interaction) {
    if (!isModerator(interaction.member)) return noPermission(interaction);
    const sub     = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel.isTextBased()) return errorReply(interaction, 'Slowmode can only be set on text channels.');

    if (sub === 'set') {
      const durStr = interaction.options.getString('duration');
      let seconds  = 0;
      if (durStr !== '0') {
        const dur = parseWithBounds(durStr, { min: 1000, max: 6 * 60 * 60 * 1000, label: 'slowmode duration' });
        if (!dur.valid) return errorReply(interaction, dur.reason);
        seconds = Math.floor(dur.ms / 1000);
      }
      await channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [success(seconds === 0
          ? `Slowmode disabled in <#${channel.id}>.`
          : `Slowmode set to **${seconds}s** in <#${channel.id}>.`,
        )],
        ephemeral: true,
      });
    }

    else if (sub === 'disable') {
      await channel.setRateLimitPerUser(0, `Slowmode disabled by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Slowmode disabled in <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'view') {
      const rate = channel.rateLimitPerUser || 0;
      await interaction.reply({
        embeds: [info(`Slowmode in <#${channel.id}>: **${rate === 0 ? 'Disabled' : `${rate}s`}**`)],
        ephemeral: true,
      });
    }

    else if (sub === 'preset') {
      const seconds = parseInt(interaction.options.getString('preset'));
      await channel.setRateLimitPerUser(seconds, `Slowmode preset by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [success(`Slowmode preset applied: **${seconds}s** in <#${channel.id}>.`)],
        ephemeral: true,
      });
    }
  },
};
