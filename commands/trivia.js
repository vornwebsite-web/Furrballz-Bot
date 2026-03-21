'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply } = require('../utils/errors');
const { ordinal }    = require('../utils/formatters');
const axios          = require('axios');

// In-memory active sessions: Map<channelId, session>
const sessions = new Map();

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Trivia game')
    .addSubcommand(s => s
      .setName('start')
      .setDescription('Start a trivia game')
      .addStringOption(o => o.setName('category').setDescription('Category').setRequired(false)
        .addChoices(
          { name: 'General',     value: '9'  },
          { name: 'Science',     value: '17' },
          { name: 'History',     value: '23' },
          { name: 'Geography',   value: '22' },
          { name: 'Sports',      value: '21' },
          { name: 'Video Games', value: '15' },
          { name: 'Music',       value: '12' },
        ))
      .addIntegerOption(o => o.setName('questions').setDescription('Number of questions (1-10)').setMinValue(1).setMaxValue(10)))
    .addSubcommand(s => s.setName('stop').setDescription('Stop the current trivia session'))
    .addSubcommand(s => s.setName('score').setDescription('View scores in the current session'))
    .addSubcommand(s => s.setName('leaderboard').setDescription('All-time trivia leaderboard'))
    .addSubcommand(s => s
      .setName('category')
      .setDescription('List available trivia categories')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      if (sessions.has(interaction.channel.id)) return errorReply(interaction, 'A trivia session is already active in this channel.');
      const category  = interaction.options.getString('category') || '';
      const total     = interaction.options.getInteger('questions') || 5;
      await interaction.deferReply();

      try {
        const url = `https://opentdb.com/api.php?amount=${total}&type=multiple${category ? `&category=${category}` : ''}`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data.response_code !== 0 || !res.data.results.length) {
          return interaction.editReply({ embeds: [info('Could not fetch trivia questions. Try again.')] });
        }

        const questions = res.data.results.map(q => ({
          question: decodeHTMLEntities(q.question),
          correct:  decodeHTMLEntities(q.correct_answer),
          options:  shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeHTMLEntities)),
          difficulty: q.difficulty,
        }));

        const session = { questions, current: 0, scores: new Map(), hostId: interaction.user.id, total };
        sessions.set(interaction.channel.id, session);

        await interaction.editReply({ embeds: [success(`🎯 Trivia started! **${total}** questions.\nYou have **15 seconds** per question.\nType the letter of your answer!`)] });
        await askQuestion(interaction.channel, session, interaction.channel.id);
      } catch (err) {
        await interaction.editReply({ embeds: [info('Failed to fetch trivia questions. Try again later.')] });
      }
    }

    else if (sub === 'stop') {
      if (!sessions.has(interaction.channel.id)) return errorReply(interaction, 'No active trivia session.');
      sessions.delete(interaction.channel.id);
      await interaction.reply({ embeds: [info('Trivia session stopped.')] });
    }

    else if (sub === 'score') {
      const session = sessions.get(interaction.channel.id);
      if (!session) return errorReply(interaction, 'No active trivia session.');
      const sorted = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);
      if (!sorted.length) return interaction.reply({ embeds: [info('No scores yet.')], ephemeral: true });
      const lines = sorted.map(([id, pts], i) => `${ordinal(i + 1)}. <@${id}> — **${pts}** pts`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), 'Current Scores')] });
    }

    else if (sub === 'leaderboard') {
      await interaction.reply({ embeds: [info('All-time trivia leaderboard requires persistent storage.\nCurrent session scores are tracked in memory.')] });
    }

    else if (sub === 'category') {
      await interaction.reply({ embeds: [info([
        '**9** — General Knowledge',
        '**17** — Science & Nature',
        '**23** — History',
        '**22** — Geography',
        '**21** — Sports',
        '**15** — Video Games',
        '**12** — Music',
        '',
        'Use `/trivia start category:` to pick one.',
      ].join('\n'), 'Trivia Categories')] });
    }
  },
};

async function askQuestion(channel, session, channelId) {
  if (session.current >= session.total || !sessions.has(channelId)) {
    const sorted = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);
    const lines  = sorted.length ? sorted.map(([id, pts], i) => `${ordinal(i + 1)}. <@${id}> — **${pts}** pts`) : ['No one scored!'];
    sessions.delete(channelId);
    await channel.send({ embeds: [neutral(lines.join('\n'), `🏆 Trivia Over! Final Scores`)] });
    return;
  }

  const q       = session.questions[session.current];
  const letters = ['A', 'B', 'C', 'D'];
  const optsText = q.options.map((o, i) => `**${letters[i]}.** ${o}`).join('\n');
  const embed   = info(`${optsText}\n\n*You have 15 seconds!*`, `Question ${session.current + 1}/${session.total}: ${q.question}`);

  await channel.send({ embeds: [embed] });

  const collector = channel.createMessageCollector({
    time: 15000,
    filter: m => ['A', 'B', 'C', 'D'].includes(m.content.toUpperCase()),
  });

  const answered = new Set();
  collector.on('collect', msg => {
    if (answered.has(msg.author.id)) return;
    const letter  = msg.content.toUpperCase();
    const idx     = letters.indexOf(letter);
    const correct = q.options[idx] === q.correct;
    if (correct) {
      const pts = q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
      session.scores.set(msg.author.id, (session.scores.get(msg.author.id) || 0) + pts);
      msg.react('✅').catch(() => {});
      answered.add(msg.author.id);
    } else {
      msg.react('❌').catch(() => {});
      answered.add(msg.author.id);
    }
  });

  collector.on('end', async () => {
    session.current++;
    await channel.send({ embeds: [info(`✅ The correct answer was: **${q.correct}**`)] });
    setTimeout(() => askQuestion(channel, session, channelId), 2000);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function decodeHTMLEntities(str) {
  return str.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'");
}
