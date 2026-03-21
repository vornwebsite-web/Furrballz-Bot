'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { info, neutral, error } = require('../utils/embedBuilder');
const { errorReply } = require('../utils/errors');

// NOTE: Full music implementation requires @discordjs/voice + a source library
// (e.g. play-dl or ytdl-core). This file provides the full command interface
// and a clean stub ready to connect to your preferred music backend.

// In-memory queue per guild: Map<guildId, { queue: [], loop: false, volume: 100, connection: null, player: null }>
const queues = new Map();

function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, { queue: [], loop: false, volume: 100, connection: null, player: null, paused: false });
  return queues.get(guildId);
}

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music player')
    .addSubcommand(s => s
      .setName('play')
      .setDescription('Play a song or add it to the queue')
      .addStringOption(o => o.setName('query').setDescription('Song name or URL').setRequired(true)))
    .addSubcommand(s => s.setName('pause').setDescription('Pause the current track'))
    .addSubcommand(s => s.setName('skip').setDescription('Skip the current track'))
    .addSubcommand(s => s.setName('queue').setDescription('View the current queue'))
    .addSubcommand(s => s.setName('stop').setDescription('Stop playback and clear the queue'))
    .addSubcommand(s => s
      .setName('volume')
      .setDescription('Set the playback volume')
      .addIntegerOption(o => o.setName('level').setDescription('Volume 1-100').setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand(s => s.setName('nowplaying').setDescription('Show the currently playing track'))
    .addSubcommand(s => s.setName('shuffle').setDescription('Shuffle the queue'))
    .addSubcommand(s => s
      .setName('loop')
      .setDescription('Toggle loop for the current track or queue')
      .addStringOption(o => o.setName('mode').setDescription('Loop mode').setRequired(true)
        .addChoices({ name: 'Off', value: 'off' }, { name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' }))),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const vc     = interaction.member?.voice?.channel;
    const gState = getQueue(interaction.guild.id);

    // Most music commands require the user to be in a voice channel
    if (['play', 'skip', 'stop', 'shuffle'].includes(sub) && !vc) {
      return errorReply(interaction, 'You must be in a voice channel to use this command.');
    }

    if (sub === 'play') {
      const query = interaction.options.getString('query');
      await interaction.reply({ embeds: [info(`🎵 Searching for **${query}**...\n\n*Music playback requires a voice connection backend (play-dl or ytdl-core) to be configured.*\n\nThe full music command interface is ready — connect your preferred audio source in \`services/musicService.js\` to enable playback.`, 'Music')] });
    }

    else if (sub === 'pause') {
      if (!gState.player) return errorReply(interaction, 'Nothing is currently playing.');
      gState.paused = !gState.paused;
      await interaction.reply({ embeds: [info(gState.paused ? '⏸ Playback paused.' : '▶️ Playback resumed.')] });
    }

    else if (sub === 'skip') {
      if (!gState.queue.length && !gState.player) return errorReply(interaction, 'Nothing is playing.');
      await interaction.reply({ embeds: [info('⏭ Skipped the current track.')] });
    }

    else if (sub === 'queue') {
      if (!gState.queue.length) return interaction.reply({ embeds: [info('The queue is empty.')], ephemeral: true });
      const lines = gState.queue.map((t, i) => `${i + 1}. **${t.title}** — requested by <@${t.requesterId}>`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `Queue (${gState.queue.length} tracks)`)] });
    }

    else if (sub === 'stop') {
      gState.queue = [];
      gState.paused = false;
      await interaction.reply({ embeds: [info('⏹ Stopped playback and cleared the queue.')] });
    }

    else if (sub === 'volume') {
      const level    = interaction.options.getInteger('level');
      gState.volume  = level;
      await interaction.reply({ embeds: [info(`🔊 Volume set to **${level}%**.`)] });
    }

    else if (sub === 'nowplaying') {
      const current = gState.queue[0];
      if (!current) return errorReply(interaction, 'Nothing is currently playing.');
      await interaction.reply({ embeds: [info(`**${current.title}**\nRequested by <@${current.requesterId}>`, 'Now Playing 🎵')] });
    }

    else if (sub === 'shuffle') {
      if (!gState.queue.length) return errorReply(interaction, 'The queue is empty.');
      for (let i = gState.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gState.queue[i], gState.queue[j]] = [gState.queue[j], gState.queue[i]];
      }
      await interaction.reply({ embeds: [info('🔀 Queue shuffled!')] });
    }

    else if (sub === 'loop') {
      const mode     = interaction.options.getString('mode');
      gState.loop    = mode !== 'off';
      await interaction.reply({ embeds: [info(`🔁 Loop set to **${mode}**.`)] });
    }
  },
};
