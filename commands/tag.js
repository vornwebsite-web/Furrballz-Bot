'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');
const { paginate }    = require('../utils/paginator');
const { tagModal }    = require('../utils/modalBuilder');
const Tag = require('../models/Tag');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Server tag system')
    .addSubcommand(s => s.setName('create').setDescription('Create a new tag'))
    .addSubcommand(s => s
      .setName('show')
      .setDescription('Show a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Delete a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit a tag\'s content')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('content').setDescription('New content').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all server tags'))
    .addSubcommand(s => s
      .setName('raw')
      .setDescription('View raw content of a tag')
      .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const tags    = await Tag.find({ guildId: interaction.guild.id, name: { $regex: focused, $options: 'i' } }).limit(25);
    await interaction.respond(tags.map(t => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') return interaction.showModal(tagModal());

    else if (sub === 'show') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag  = await Tag.findOneAndUpdate({ name, guildId: interaction.guild.id }, { $inc: { uses: 1 } }, { new: true });
      if (!tag) return errorReply(interaction, `Tag \`${name}\` not found.`);
      await interaction.reply({ content: tag.content });
    }

    else if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag  = await Tag.findOne({ name, guildId: interaction.guild.id });
      if (!tag) return errorReply(interaction, 'Tag not found.');
      if (tag.authorId !== interaction.user.id && !isModerator(interaction.member)) return noPermission(interaction);
      await tag.deleteOne();
      await interaction.reply({ embeds: [success(`Tag \`${name}\` deleted.`)], ephemeral: true });
    }

    else if (sub === 'edit') {
      const name    = interaction.options.getString('name').toLowerCase();
      const content = interaction.options.getString('content');
      const tag     = await Tag.findOne({ name, guildId: interaction.guild.id });
      if (!tag) return errorReply(interaction, 'Tag not found.');
      if (tag.authorId !== interaction.user.id && !isModerator(interaction.member)) return noPermission(interaction);
      tag.content      = content;
      tag.lastEditedAt = new Date();
      await tag.save();
      await interaction.reply({ embeds: [success(`Tag \`${name}\` updated.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const tags = await Tag.find({ guildId: interaction.guild.id }).sort({ uses: -1 });
      if (!tags.length) return interaction.reply({ embeds: [info('No tags in this server yet.')], ephemeral: true });
      const lines = tags.map(t => `\`${t.name}\` — ${t.uses} uses — <@${t.authorId}>`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 10) pages.push(neutral(lines.slice(i, i + 10).join('\n'), `Server Tags (${tags.length})`));
      await paginate(interaction, pages);
    }

    else if (sub === 'raw') {
      const name = interaction.options.getString('name').toLowerCase();
      const tag  = await Tag.findOne({ name, guildId: interaction.guild.id });
      if (!tag) return errorReply(interaction, 'Tag not found.');
      await interaction.reply({ content: `\`\`\`\n${tag.content.slice(0, 1990)}\n\`\`\``, ephemeral: true });
    }
  },
};
