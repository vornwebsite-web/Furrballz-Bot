'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('thread')
    .setDescription('Thread management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)

    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a new thread in this channel')
      .addStringOption(o => o.setName('name').setDescription('Thread name').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('First message in the thread'))
      .addBooleanOption(o => o.setName('private').setDescription('Make thread private (invite-only)'))
      .addStringOption(o => o.setName('auto_archive').setDescription('Auto-archive after inactivity')
        .addChoices(
          { name: '1 hour',  value: '60'   },
          { name: '1 day',   value: '1440' },
          { name: '1 week',  value: '10080'},
        )))

    .addSubcommand(s => s
      .setName('archive')
      .setDescription('Archive a thread')
      .addChannelOption(o => o.setName('thread').setDescription('Thread to archive').setRequired(true)))

    .addSubcommand(s => s
      .setName('unarchive')
      .setDescription('Unarchive a thread')
      .addChannelOption(o => o.setName('thread').setDescription('Thread to unarchive').setRequired(true)))

    .addSubcommand(s => s
      .setName('lock')
      .setDescription('Lock a thread (only moderators can post)')
      .addChannelOption(o => o.setName('thread').setDescription('Thread to lock').setRequired(true)))

    .addSubcommand(s => s
      .setName('rename')
      .setDescription('Rename a thread')
      .addChannelOption(o => o.setName('thread').setDescription('Thread to rename').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('New name').setRequired(true)))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all active threads in this server')),

  async execute(interaction) {
    if (!isModerator(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name        = interaction.options.getString('name');
      const message     = interaction.options.getString('message');
      const isPrivate   = interaction.options.getBoolean('private') ?? false;
      const autoArchive = parseInt(interaction.options.getString('auto_archive') || '1440');

      if (!interaction.channel.isTextBased()) return errorReply(interaction, 'Cannot create a thread here.');

      await interaction.deferReply({ ephemeral: true });
      const thread = await interaction.channel.threads.create({
        name,
        autoArchiveDuration: autoArchive,
        type: isPrivate ? ChannelType.PrivateThread : ChannelType.PublicThread,
        reason: `Created by ${interaction.user.tag}`,
      });

      if (message) await thread.send({ content: message });
      await interaction.editReply({ embeds: [success(`Thread **${name}** created: <#${thread.id}>`)] });
    }

    else if (sub === 'archive') {
      const thread = interaction.options.getChannel('thread');
      if (!thread.isThread()) return errorReply(interaction, 'That channel is not a thread.');
      await thread.setArchived(true, `Archived by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Thread **${thread.name}** archived.`)], ephemeral: true });
    }

    else if (sub === 'unarchive') {
      const thread = interaction.options.getChannel('thread');
      if (!thread.isThread()) return errorReply(interaction, 'That channel is not a thread.');
      await thread.setArchived(false, `Unarchived by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Thread **${thread.name}** unarchived.`)], ephemeral: true });
    }

    else if (sub === 'lock') {
      const thread = interaction.options.getChannel('thread');
      if (!thread.isThread()) return errorReply(interaction, 'That channel is not a thread.');
      await thread.setLocked(true, `Locked by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Thread **${thread.name}** locked.`)], ephemeral: true });
    }

    else if (sub === 'rename') {
      const thread = interaction.options.getChannel('thread');
      const name   = interaction.options.getString('name');
      if (!thread.isThread()) return errorReply(interaction, 'That channel is not a thread.');
      await thread.setName(name, `Renamed by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Thread renamed to **${name}**.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const threads = [...interaction.guild.channels.cache.filter(c => c.isThread() && !c.archived).values()];
      if (!threads.length) return interaction.reply({ embeds: [info('No active threads.')], ephemeral: true });
      const lines = threads.map(t => `<#${t.id}> — **${t.name}** (${t.type === ChannelType.PrivateThread ? 'Private' : 'Public'})`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `Active Threads (${threads.length})`)] });
    }
  },
};
