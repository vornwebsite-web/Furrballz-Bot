'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator, isManager }   = require('../utils/permissions');
const { embedModal } = require('../utils/modalBuilder');

// In-memory embed storage per guild (non-persistent, simple use case)
const embedStore = new Map(); // guildId → Map<name, embedData>

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Custom embed builder')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a custom embed via modal'))
    .addSubcommand(s => s
      .setName('send')
      .setDescription('Send a saved embed to a channel')
      .addStringOption(o => o.setName('name').setDescription('Embed name').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel')))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit a saved embed')
      .addStringOption(o => o.setName('name').setDescription('Embed name').setRequired(true)))
    .addSubcommand(s => s
      .setName('clone')
      .setDescription('Clone a saved embed under a new name')
      .addStringOption(o => o.setName('source').setDescription('Source embed name').setRequired(true))
      .addStringOption(o => o.setName('target').setDescription('New embed name').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all saved embeds')),

  async execute(interaction) {
    if (!isModerator(interaction.member)) return noPermission(interaction);
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (!embedStore.has(guildId)) embedStore.set(guildId, new Map());
    const store = embedStore.get(guildId);

    if (sub === 'create') return interaction.showModal(embedModal());

    else if (sub === 'send') {
      const name    = interaction.options.getString('name').toLowerCase();
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const data    = store.get(name);
      if (!data) return errorReply(interaction, `Embed \`${name}\` not found. Use \`/embed create\` first.`);
      const embed = new EmbedBuilder(data);
      await channel.send({ embeds: [embed] });
      await interaction.reply({ embeds: [success(`Embed sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'edit') {
      const name = interaction.options.getString('name').toLowerCase();
      if (!store.has(name)) return errorReply(interaction, `Embed \`${name}\` not found.`);
      const modal = embedModal();
      modal.setCustomId(`embed_edit_modal_${name}`);
      return interaction.showModal(modal);
    }

    else if (sub === 'clone') {
      const source = interaction.options.getString('source').toLowerCase();
      const target = interaction.options.getString('target').toLowerCase();
      const data   = store.get(source);
      if (!data) return errorReply(interaction, `Embed \`${source}\` not found.`);
      store.set(target, { ...data });
      await interaction.reply({ embeds: [success(`Embed \`${source}\` cloned to \`${target}\`.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const names = [...store.keys()];
      if (!names.length) return interaction.reply({ embeds: [info('No saved embeds. Use `/embed create` to create one.')], ephemeral: true });
      await interaction.reply({ embeds: [neutral(names.map(n => `\`${n}\``).join(', '), `Saved Embeds (${names.length})`)], ephemeral: true });
    }
  },
};
