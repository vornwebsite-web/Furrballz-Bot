'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const axios = require('axios');

const EIGHT_BALL = ['It is certain','It is decidedly so','Without a doubt','Yes, definitely','You may rely on it','As I see it, yes','Most likely','Outlook good','Yes','Signs point to yes','Reply hazy, try again','Ask again later','Better not tell you now','Cannot predict now','Concentrate and ask again','Don\'t count on it','My reply is no','My sources say no','Outlook not so good','Very doubtful'];

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun commands')
    .addSubcommand(s => s
      .setName('8ball')
      .setDescription('Ask the magic 8ball a question')
      .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)))
    .addSubcommand(s => s.setName('coinflip').setDescription('Flip a coin'))
    .addSubcommand(s => s
      .setName('dice')
      .setDescription('Roll dice')
      .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(100))
      .addIntegerOption(o => o.setName('count').setDescription('Number of dice (default 1)').setMinValue(1).setMaxValue(10)))
    .addSubcommand(s => s
      .setName('rps')
      .setDescription('Play rock paper scissors')
      .addStringOption(o => o.setName('choice').setDescription('Your choice').setRequired(true)
        .addChoices({ name: 'Rock', value: 'rock' }, { name: 'Paper', value: 'paper' }, { name: 'Scissors', value: 'scissors' })))
    .addSubcommand(s => s.setName('meme').setDescription('Get a random meme'))
    .addSubcommand(s => s.setName('joke').setDescription('Get a random joke')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === '8ball') {
      const question = interaction.options.getString('question');
      const answer   = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
      await interaction.reply({ embeds: [info(`**${question}**\n\n🎱 *${answer}*`, 'Magic 8Ball')] });
    }

    else if (sub === 'coinflip') {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await interaction.reply({ embeds: [neutral(`🪙 The coin landed on **${result}**!`)] });
    }

    else if (sub === 'dice') {
      const sides  = interaction.options.getInteger('sides') || 6;
      const count  = interaction.options.getInteger('count') || 1;
      const rolls  = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const total  = rolls.reduce((a, b) => a + b, 0);
      const result = count > 1 ? `Rolls: **${rolls.join(', ')}**\nTotal: **${total}**` : `🎲 You rolled a **${rolls[0]}**!`;
      await interaction.reply({ embeds: [neutral(result, `${count}d${sides}`)] });
    }

    else if (sub === 'rps') {
      const choices = ['rock', 'paper', 'scissors'];
      const emojis  = { rock: '🪨', paper: '📄', scissors: '✂️' };
      const user    = interaction.options.getString('choice');
      const bot     = choices[Math.floor(Math.random() * 3)];
      const win     = (user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper');
      const tie     = user === bot;
      const result  = tie ? '**Tie!**' : win ? '**You win!** 🎉' : '**You lose!** 😔';
      await interaction.reply({ embeds: [neutral(`${emojis[user]} vs ${emojis[bot]}\n\n${result}`,'Rock Paper Scissors')] });
    }

    else if (sub === 'meme') {
      try {
        const res  = await axios.get('https://meme-api.com/gimme', { timeout: 5000 });
        const meme = res.data;
        await interaction.reply({ embeds: [neutral(null, meme.title).setImage(meme.url).setFooter({ text: `r/${meme.subreddit} • 👍 ${meme.ups}` })] });
      } catch {
        await interaction.reply({ content: 'Could not fetch a meme right now. Try again!', ephemeral: true });
      }
    }

    else if (sub === 'joke') {
      try {
        const res  = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart', { timeout: 5000 });
        const joke = res.data;
        await interaction.reply({ embeds: [neutral(`${joke.setup}\n\n||${joke.delivery}||`, '😄 Random Joke')] });
      } catch {
        await interaction.reply({ content: 'Could not fetch a joke right now. Try again!', ephemeral: true });
      }
    }
  },
};
