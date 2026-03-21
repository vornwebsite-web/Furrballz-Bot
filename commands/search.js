'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { info, neutral, error } = require('../utils/embedBuilder');
const { errorReply }           = require('../utils/errors');
const { truncate }             = require('../utils/formatters');
const axios                    = require('axios');

module.exports = {
  cooldown: 5000,
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search and lookup commands')

    .addSubcommand(s => s
      .setName('wikipedia')
      .setDescription('Search Wikipedia for a topic')
      .addStringOption(o => o.setName('query').setDescription('Search query').setRequired(true)))

    .addSubcommand(s => s
      .setName('define')
      .setDescription('Define a word using the dictionary')
      .addStringOption(o => o.setName('word').setDescription('Word to define').setRequired(true)))

    .addSubcommand(s => s
      .setName('github')
      .setDescription('Look up a GitHub user or repository')
      .addStringOption(o => o.setName('query').setDescription('Username or username/repo').setRequired(true)))

    .addSubcommand(s => s
      .setName('color')
      .setDescription('Look up a hex color')
      .addStringOption(o => o.setName('hex').setDescription('Hex color code e.g. 7F77DD').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    if (sub === 'wikipedia') {
      const query = interaction.options.getString('query');
      try {
        const res  = await axios.get('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query), { timeout: 8000 });
        const data = res.data;
        if (data.type === 'disambiguation') {
          return interaction.editReply({ embeds: [info(`**${data.title}** is a disambiguation page. Try a more specific query.`, 'Wikipedia')] });
        }
        const embed = info(
          truncate(data.extract || 'No summary available.', 2000),
          data.title,
        ).setURL(data.content_urls?.desktop?.page || null);
        if (data.thumbnail?.source) embed.setThumbnail(data.thumbnail.source);
        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Could not find **${query}** on Wikipedia.`)] });
      }
    }

    else if (sub === 'define') {
      const word = interaction.options.getString('word').toLowerCase();
      try {
        const res  = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 8000 });
        const entry = res.data[0];
        const meanings = entry.meanings.slice(0, 3).map(m => {
          const defs = m.definitions.slice(0, 2).map((d, i) => `${i + 1}. ${truncate(d.definition, 200)}`).join('\n');
          return `**${m.partOfSpeech}**\n${defs}`;
        }).join('\n\n');

        const embed = info(meanings, `📖 ${entry.word}`)
          .setFooter({ text: entry.phonetic || '' });
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply({ embeds: [error(`Could not find a definition for **${word}**.`)] });
      }
    }

    else if (sub === 'github') {
      const query = interaction.options.getString('query');
      const isRepo = query.includes('/');
      try {
        const url  = isRepo
          ? `https://api.github.com/repos/${query}`
          : `https://api.github.com/users/${query}`;
        const res  = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'FurrballzBot' } });
        const d    = res.data;
        const embed = isRepo
          ? neutral([
              `**${d.full_name}** ${d.private ? '🔒' : '🌐'}`,
              d.description || '',
              '',
              `⭐ ${d.stargazers_count.toLocaleString()} | 🍴 ${d.forks_count.toLocaleString()} | 👁️ ${d.watchers_count.toLocaleString()}`,
              `Language: **${d.language || 'Unknown'}**`,
              `Open Issues: **${d.open_issues_count}**`,
            ].join('\n'), 'GitHub Repository').setURL(d.html_url).setThumbnail(d.owner.avatar_url)
          : neutral([
              `**${d.name || d.login}** (@${d.login})`,
              d.bio || '',
              '',
              `👥 **${d.followers.toLocaleString()}** followers | **${d.following.toLocaleString()}** following`,
              `📦 Public repos: **${d.public_repos}**`,
              d.company ? `🏢 ${d.company}` : '',
              d.location ? `📍 ${d.location}` : '',
            ].filter(Boolean).join('\n'), 'GitHub User').setURL(d.html_url).setThumbnail(d.avatar_url);
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply({ embeds: [error(`Could not find GitHub ${isRepo ? 'repository' : 'user'} **${query}**.`)] });
      }
    }

    else if (sub === 'color') {
      const hex = interaction.options.getString('hex').replace('#', '');
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return interaction.editReply({ embeds: [error('Invalid hex color. Use format: `7F77DD`')] });
      const decimal = parseInt(hex, 16);
      const r = (decimal >> 16) & 255;
      const g = (decimal >> 8)  & 255;
      const b =  decimal        & 255;
      const embed = info([
        `**Hex:** \`#${hex.toUpperCase()}\``,
        `**RGB:** rgb(${r}, ${g}, ${b})`,
        `**Decimal:** ${decimal}`,
        `**HSL:** ${toHSL(r, g, b)}`,
      ].join('\n'), `🎨 Color #${hex.toUpperCase()}`).setColor(decimal).setThumbnail(`https://singlecolorimage.com/get/${hex}/100x100`);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function toHSL(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
