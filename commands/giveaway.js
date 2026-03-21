'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager, isModerator }   = require('../utils/permissions');
const { parseWithBounds }          = require('../utils/timeParser');
const { ms: fmtMs }                = require('../utils/formatters');
const { paginate }                 = require('../utils/paginator');
const giveawayService = require('../services/giveawayService');
const Giveaway        = require('../models/Giveaway');

module.exports = {
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s
      .setName('start')
      .setDescription('Start a new giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 1d, 7d').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to host giveaway (defaults to current)'))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20))
      .addRoleOption(o => o.setName('required_role').setDescription('Role required to enter')))

    .addSubcommand(s => s
      .setName('end')
      .setDescription('End a giveaway early')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)))

    .addSubcommand(s => s
      .setName('reroll')
      .setDescription('Reroll winners for an ended giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true))
      .addIntegerOption(o => o.setName('count').setDescription('Number of new winners').setMinValue(1).setMaxValue(10)))

    .addSubcommand(s => s
      .setName('pause')
      .setDescription('Pause a running giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('resume')
      .setDescription('Resume a paused giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all active giveaways in this server'))

    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit a running giveaway\'s prize')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('prize').setDescription('New prize text').setRequired(true))),

  async execute(interaction, client) {
    if (!isModerator(interaction.member)) return noPermission(interaction);

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize    = interaction.options.getString('prize');
      const durStr   = interaction.options.getString('duration');
      const channel  = interaction.options.getChannel('channel') || interaction.channel;
      const winners  = interaction.options.getInteger('winners') || 1;
      const reqRole  = interaction.options.getRole('required_role');

      const dur = parseWithBounds(durStr, { min: 10000, max: 30 * 24 * 60 * 60 * 1000, label: 'giveaway duration' });
      if (!dur.valid) return errorReply(interaction, dur.reason);

      await interaction.deferReply({ ephemeral: true });
      const giveaway = await giveawayService.createGiveaway(channel, {
        prize,
        duration:     dur.ms,
        hostId:       interaction.user.id,
        winnersCount: winners,
        requirements: reqRole ? { roleId: reqRole.id } : {},
      }, client);

      await interaction.editReply({ embeds: [success(`Giveaway started in <#${channel.id}>!\n**Prize:** ${prize}\n**Duration:** ${fmtMs(dur.ms)}\n**Winners:** ${winners}`)] });
    }

    else if (sub === 'end') {
      const msgId    = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!giveaway)         return errorReply(interaction, 'Giveaway not found.');
      if (giveaway.ended)    return errorReply(interaction, 'This giveaway has already ended.');

      await interaction.deferReply({ ephemeral: true });
      giveaway.endsAt = new Date();
      await giveaway.save();
      const winners = await giveawayService.endGiveaway(giveaway, client);
      await interaction.editReply({ embeds: [success(`Giveaway ended! Winners: ${winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'None'}`)] });
    }

    else if (sub === 'reroll') {
      const msgId    = interaction.options.getString('message_id');
      const count    = interaction.options.getInteger('count') || 1;
      const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!giveaway)       return errorReply(interaction, 'Giveaway not found.');
      if (!giveaway.ended) return errorReply(interaction, 'Giveaway has not ended yet.');

      await interaction.deferReply({ ephemeral: true });
      const newWinners = await giveawayService.reroll(giveaway, client, count);
      if (newWinners.length === 0) return interaction.editReply({ embeds: [error('No eligible entries to reroll from.')] });
      await interaction.editReply({ embeds: [success(`Rerolled! New winner(s): ${newWinners.map(id => `<@${id}>`).join(', ')}`)] });
    }

    else if (sub === 'pause') {
      const msgId    = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!giveaway || giveaway.ended) return errorReply(interaction, 'Active giveaway not found.');
      giveaway.paused = true;
      await giveaway.save();
      await interaction.reply({ embeds: [success('Giveaway paused.')], ephemeral: true });
    }

    else if (sub === 'resume') {
      const msgId    = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!giveaway || giveaway.ended) return errorReply(interaction, 'Giveaway not found.');
      giveaway.paused = false;
      await giveaway.save();
      await interaction.reply({ embeds: [success('Giveaway resumed.')], ephemeral: true });
    }

    else if (sub === 'list') {
      const giveaways = await Giveaway.find({ guildId: interaction.guild.id, ended: false }).sort({ endsAt: 1 });
      if (giveaways.length === 0) return interaction.reply({ embeds: [info('No active giveaways.')], ephemeral: true });
      const lines = giveaways.map(g => `**${g.prize}** — <#${g.channelId}> — Ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R> — ${g.entries.length} entries${g.paused ? ' *(paused)*' : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) pages.push(info(lines.slice(i, i + 5).join('\n'), 'Active Giveaways'));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'edit') {
      const msgId    = interaction.options.getString('message_id');
      const prize    = interaction.options.getString('prize');
      const giveaway = await Giveaway.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!giveaway || giveaway.ended) return errorReply(interaction, 'Active giveaway not found.');
      giveaway.prize = prize;
      await giveaway.save();
      await interaction.reply({ embeds: [success(`Giveaway prize updated to **${prize}**.`)], ephemeral: true });
    }
  },
};
