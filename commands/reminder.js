'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply } = require('../utils/errors');
const { parseWithBounds } = require('../utils/timeParser');
const { relativeTime }    = require('../utils/formatters');
const { paginate }        = require('../utils/paginator');
const Reminder            = require('../models/Reminder');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set personal reminders')
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set a reminder')
      .addStringOption(o => o.setName('duration').setDescription('When to remind you e.g. 1h, 30m').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('View your pending reminders'))
    .addSubcommand(s => s
      .setName('cancel')
      .setDescription('Cancel a reminder')
      .addStringOption(o => o.setName('id').setDescription('Reminder ID').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Cancel all your reminders')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const durStr  = interaction.options.getString('duration');
      const message = interaction.options.getString('message');
      const dur     = parseWithBounds(durStr, { min: 10000, max: 30 * 24 * 60 * 60 * 1000, label: 'reminder duration' });
      if (!dur.valid) return errorReply(interaction, dur.reason);

      const count = await Reminder.countDocuments({ userId: interaction.user.id, fired: false });
      if (count >= 10) return errorReply(interaction, 'You can have at most 10 pending reminders.');

      const fireAt = new Date(Date.now() + dur.ms);
      const doc    = await Reminder.create({
        userId:    interaction.user.id,
        guildId:   interaction.guild?.id || null,
        channelId: interaction.channel?.id || null,
        message,
        fireAt,
      });

      await interaction.reply({ embeds: [success(`Reminder set! I'll remind you ${relativeTime(fireAt)}.\n\n*"${message}"*\nID: \`${doc._id}\``)], ephemeral: true });
    }

    else if (sub === 'list') {
      const reminders = await Reminder.find({ userId: interaction.user.id, fired: false }).sort({ fireAt: 1 });
      if (!reminders.length) return interaction.reply({ embeds: [info('You have no pending reminders.')], ephemeral: true });
      const lines = reminders.map(r => `\`${r._id}\` — ${relativeTime(r.fireAt)}\n*"${r.message.slice(0, 80)}"*`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) pages.push(neutral(lines.slice(i, i + 5).join('\n\n'), `Your Reminders (${reminders.length})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'cancel') {
      const id  = interaction.options.getString('id');
      const doc = await Reminder.findOneAndDelete({ _id: id, userId: interaction.user.id, fired: false });
      if (!doc) return errorReply(interaction, 'Reminder not found or already fired.');
      await interaction.reply({ embeds: [success('Reminder cancelled.')], ephemeral: true });
    }

    else if (sub === 'clear') {
      const result = await Reminder.deleteMany({ userId: interaction.user.id, fired: false });
      await interaction.reply({ embeds: [success(`Cancelled **${result.deletedCount}** reminder(s).`)], ephemeral: true });
    }
  },
};
