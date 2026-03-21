'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Sticky message system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set a sticky message in a channel')
      .addStringOption(o => o.setName('message').setDescription('Sticky message content').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove the sticky message from a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)')))
    .addSubcommand(s => s.setName('list').setDescription('List all sticky messages in this server'))
    .addSubcommand(s => s
      .setName('pause')
      .setDescription('Temporarily pause sticky reposts in a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)'))),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const channel  = interaction.options.getChannel('channel') || interaction.channel;
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);

    if (!(guildDoc.stickyMessages instanceof Map)) guildDoc.stickyMessages = new Map();

    if (sub === 'set') {
      const message = interaction.options.getString('message');
      guildDoc.stickyMessages.set(channel.id, message);
      guildDoc.markModified('stickyMessages');
      await guildDoc.save();
      await channel.send({ content: message });
      await interaction.reply({ embeds: [success(`Sticky message set in <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'remove') {
      if (!guildDoc.stickyMessages.has(channel.id)) return errorReply(interaction, 'No sticky message in that channel.');
      guildDoc.stickyMessages.delete(channel.id);
      guildDoc.markModified('stickyMessages');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Sticky message removed from <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const entries = [...guildDoc.stickyMessages.entries()];
      if (!entries.length) return interaction.reply({ embeds: [info('No sticky messages set.')], ephemeral: true });
      const lines = entries.map(([id, msg]) => `<#${id}> — *"${msg.slice(0, 60)}${msg.length > 60 ? '...' : ''}"*`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `Sticky Messages (${entries.length})`)], ephemeral: true });
    }

    else if (sub === 'pause') {
      // Pausing is done by temporarily removing from map (simple approach)
      if (!guildDoc.stickyMessages.has(channel.id)) return errorReply(interaction, 'No sticky message in that channel.');
      const content = guildDoc.stickyMessages.get(channel.id);
      guildDoc.stickyMessages.delete(channel.id);
      guildDoc.markModified('stickyMessages');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Sticky message paused in <#${channel.id}>. Use \`/sticky set\` to re-enable.`)], ephemeral: true });
    }
  },
};
