'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');
const { single } = require('../utils/buttonBuilder');
const { ButtonStyle } = require('discord.js');
const Poll = require('../models/Poll');

const EMOJI_OPTIONS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Poll system')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a poll')
      .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption(o => o.setName('options').setDescription('Options separated by | (e.g. Yes|No|Maybe)').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Poll duration e.g. 1h, 1d'))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post poll')))
    .addSubcommand(s => s
      .setName('end')
      .setDescription('End a poll early')
      .addStringOption(o => o.setName('message_id').setDescription('Poll message ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('results')
      .setDescription('View poll results')
      .addStringOption(o => o.setName('message_id').setDescription('Poll message ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('vote')
      .setDescription('Vote on a poll')
      .addStringOption(o => o.setName('message_id').setDescription('Poll message ID').setRequired(true))
      .addIntegerOption(o => o.setName('option').setDescription('Option number (1-10)').setRequired(true).setMinValue(1).setMaxValue(10))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const question = interaction.options.getString('question');
      const opts     = interaction.options.getString('options').split('|').map(o => o.trim()).filter(Boolean);
      const channel  = interaction.options.getChannel('channel') || interaction.channel;
      const durStr   = interaction.options.getString('duration');

      if (opts.length < 2 || opts.length > 10) return errorReply(interaction, 'Polls must have 2–10 options.');

      let endsAt = null;
      if (durStr) {
        const dur = parseWithBounds(durStr, { min: 60000, max: 7 * 24 * 60 * 60 * 1000 });
        if (!dur.valid) return errorReply(interaction, dur.reason);
        endsAt = new Date(Date.now() + dur.ms);
      }

      const optText = opts.map((o, i) => `${EMOJI_OPTIONS[i]} ${o}`).join('\n');
      const embed   = info(`${optText}${endsAt ? `\n\nEnds: <t:${Math.floor(endsAt.getTime() / 1000)}:R>` : ''}`, question);

      await interaction.deferReply({ ephemeral: true });
      const msg = await channel.send({ embeds: [embed] });

      // Add reactions
      for (let i = 0; i < opts.length; i++) {
        await msg.react(EMOJI_OPTIONS[i]).catch(() => {});
      }

      const poll = await Poll.create({
        guildId:   interaction.guild.id,
        channelId: channel.id,
        messageId: msg.id,
        hostId:    interaction.user.id,
        question,
        options:   opts,
        endsAt,
      });

      await interaction.editReply({ embeds: [success(`Poll created in <#${channel.id}>!`)] });
    }

    else if (sub === 'end') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const poll = await Poll.findOneAndUpdate(
        { messageId: interaction.options.getString('message_id'), guildId: interaction.guild.id },
        { ended: true },
      );
      if (!poll) return errorReply(interaction, 'Poll not found.');
      await interaction.reply({ embeds: [success('Poll ended.')], ephemeral: true });
    }

    else if (sub === 'results') {
      const poll = await Poll.findOne({ messageId: interaction.options.getString('message_id'), guildId: interaction.guild.id });
      if (!poll) return errorReply(interaction, 'Poll not found.');
      const total = [...poll.votes.values()].reduce((a, v) => a + v.length, 0);
      const lines = poll.options.map((o, i) => {
        const votes = poll.votes.get(String(i))?.length || 0;
        const pct   = total > 0 ? Math.round((votes / total) * 100) : 0;
        const bar   = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        return `${EMOJI_OPTIONS[i]} **${o}**\n${bar} ${votes} votes (${pct}%)`;
      });
      await interaction.reply({ embeds: [neutral(lines.join('\n\n'), `Poll Results — ${poll.question}`)], ephemeral: false });
    }

    else if (sub === 'vote') {
      const msgId  = interaction.options.getString('message_id');
      const optIdx = interaction.options.getInteger('option') - 1;
      const poll   = await Poll.findOne({ messageId: msgId, guildId: interaction.guild.id });
      if (!poll)         return errorReply(interaction, 'Poll not found.');
      if (poll.ended)    return errorReply(interaction, 'This poll has ended.');
      if (optIdx >= poll.options.length) return errorReply(interaction, 'Invalid option number.');

      // Remove previous vote
      for (const [key, voters] of poll.votes) {
        poll.votes.set(key, voters.filter(id => id !== interaction.user.id));
      }

      const current = poll.votes.get(String(optIdx)) || [];
      current.push(interaction.user.id);
      poll.votes.set(String(optIdx), current);
      poll.markModified('votes');
      await poll.save();

      await interaction.reply({ embeds: [success(`Voted for **${poll.options[optIdx]}**.`)], ephemeral: true });
    }
  },
};
