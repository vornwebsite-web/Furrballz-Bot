'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply } = require('../utils/errors');

const WORDS = ['crane','slate','adieu','audio','arise','stare','snare','share','grace','trace','place','space','glare','flare','blaze','brave','grave','shave','slave','knave','piano','braid','trail','brain','train','grain','drain','plain','claim','chair','chain','chill','chime','crime','prime','drive','bride','pride','prize','prize','flame','frame','blame','drake','brake','brake','flute','brute','fruit'];

// Active games: Map<userId, { word, guesses, maxGuesses }>
const games = new Map();

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('Play Wordle in Discord')
    .addSubcommand(s => s.setName('play').setDescription('Start a new Wordle game'))
    .addSubcommand(s => s
      .setName('guess')
      .setDescription('Make a guess')
      .addStringOption(o => o.setName('word').setDescription('Your 5-letter guess').setRequired(true).setMaxLength(5).setMinLength(5)))
    .addSubcommand(s => s.setName('stats').setDescription('View your Wordle stats'))
    .addSubcommand(s => s.setName('leaderboard').setDescription('Server Wordle leaderboard')),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'play') {
      if (games.has(userId)) return errorReply(interaction, 'You already have an active game! Use `/wordle guess` to keep playing.');
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      games.set(userId, { word, guesses: [], maxGuesses: 6 });
      await interaction.reply({ embeds: [info('🟩 Wordle started!\nGuess a **5-letter word** using `/wordle guess`.\nYou have **6 attempts**.\n\n🟩 = correct position\n🟨 = wrong position\n⬛ = not in word', 'Wordle')], ephemeral: true });
    }

    else if (sub === 'guess') {
      const game = games.get(userId);
      if (!game) return errorReply(interaction, 'No active game. Start one with `/wordle play`.');
      const guess = interaction.options.getString('word').toLowerCase();
      if (guess.length !== 5) return errorReply(interaction, 'Guess must be exactly 5 letters.');
      if (!/^[a-z]+$/.test(guess)) return errorReply(interaction, 'Only letters are allowed.');

      game.guesses.push(guess);
      const result = evaluateGuess(guess, game.word);
      const board  = game.guesses.map(g => evaluateGuess(g, game.word)).join('\n');
      const won    = guess === game.word;
      const lost   = game.guesses.length >= game.maxGuesses && !won;

      if (won) {
        games.delete(userId);
        return interaction.reply({ embeds: [success(`${board}\n\n🎉 You got it in **${game.guesses.length}** guess${game.guesses.length !== 1 ? 'es' : ''}! The word was **${game.word}**.`, 'Wordle — Won!')] });
      }
      if (lost) {
        games.delete(userId);
        return interaction.reply({ embeds: [error(`${board}\n\nGame over! The word was **${game.word}**.`, 'Wordle — Lost')] });
      }

      await interaction.reply({ embeds: [neutral(`${board}\n\n*${game.maxGuesses - game.guesses.length} guess${game.maxGuesses - game.guesses.length !== 1 ? 'es' : ''} remaining*`, `Wordle — Guess ${game.guesses.length}/${game.maxGuesses}`)] });
    }

    else if (sub === 'stats') {
      await interaction.reply({ embeds: [info('Persistent Wordle stats require a database integration.\nCurrently tracking per-session in memory.')], ephemeral: true });
    }

    else if (sub === 'leaderboard') {
      await interaction.reply({ embeds: [info('Wordle leaderboard requires persistent storage.')], ephemeral: true });
    }
  },
};

function evaluateGuess(guess, word) {
  const EMOJIS = { correct: '🟩', present: '🟨', absent: '⬛' };
  const result = new Array(5).fill('absent');
  const wordArr  = word.split('');
  const guessArr = guess.split('');
  // First pass: correct positions
  guessArr.forEach((l, i) => { if (l === wordArr[i]) { result[i] = 'correct'; wordArr[i] = null; guessArr[i] = null; } });
  // Second pass: present but wrong position
  guessArr.forEach((l, i) => { if (l && wordArr.includes(l)) { result[i] = 'present'; wordArr[wordArr.indexOf(l)] = null; } });
  return result.map(r => EMOJIS[r]).join('') + `  \`${guess.toUpperCase()}\``;
}
