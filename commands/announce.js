'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');
const { relativeTime }   = require('../utils/formatters');
const announceService    = require('../services/announceService');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Announcement system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('send')
      .setDescription('Send an announcement immediately')
      .addStringOption(o => o.setName('message').setDescription('Announcement content').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
      .addRoleOption(o => o.setName('ping').setDescription('Role to ping')))
    .addSubcommand(s => s
      .setName('schedule')
      .setDescription('Schedule an announcement for later')
      .addStringOption(o => o.setName('message').setDescription('Announcement content').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(o => o.setName('delay').setDescription('When to send e.g. 1h, 30m').setRequired(true))
      .addRoleOption(o => o.setName('ping').setDescription('Role to ping')))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit a scheduled announcement')
      .addIntegerOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('New content').setRequired(true)))
    .addSubcommand(s => s
      .setName('cancel')
      .setDescription('Cancel a scheduled announcement')
      .addIntegerOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List pending scheduled announcements')),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'send') {
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel');
      const ping    = interaction.options.getRole('ping');
      await interaction.deferReply({ ephemeral: true });
      await announceService.fire({
        guildId:   interaction.guild.id,
        channelId: channel.id,
        content:   ping ? `<@&${ping.id}> ${message}` : message,
      }, client);
      await interaction.editReply({ embeds: [success(`Announcement sent to <#${channel.id}>.`)] });
    }

    else if (sub === 'schedule') {
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel');
      const ping    = interaction.options.getRole('ping');
      const delay   = interaction.options.getString('delay');
      const dur     = parseWithBounds(delay, { min: 60000, max: 30 * 24 * 60 * 60 * 1000, label: 'schedule delay' });
      if (!dur.valid) return errorReply(interaction, dur.reason);
      const fireAt  = new Date(Date.now() + dur.ms);
      const id      = announceService.schedule({
        guildId: interaction.guild.id, channelId: channel.id,
        content: ping ? `<@&${ping.id}> ${message}` : message,
        fireAt,
      }, client);
      await interaction.reply({ embeds: [success(`Announcement scheduled (ID: **${id}**).\nWill fire ${relativeTime(fireAt)}.`)], ephemeral: true });
    }

    else if (sub === 'edit') {
      const id      = interaction.options.getInteger('id');
      const message = interaction.options.getString('message');
      const ok      = announceService.edit(id, { content: message });
      if (!ok) return errorReply(interaction, `Announcement ID **${id}** not found or already fired.`);
      await interaction.reply({ embeds: [success(`Announcement **${id}** updated.`)], ephemeral: true });
    }

    else if (sub === 'cancel') {
      const id = interaction.options.getInteger('id');
      const ok = announceService.cancel(id);
      if (!ok) return errorReply(interaction, `Announcement ID **${id}** not found or already fired.`);
      await interaction.reply({ embeds: [success(`Announcement **${id}** cancelled.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const list = announceService.list(interaction.guild.id);
      if (!list.length) return interaction.reply({ embeds: [info('No pending scheduled announcements.')], ephemeral: true });
      const lines = list.map(a => `ID **${a.id}** — <#${a.channelId}> — fires ${relativeTime(a.fireAt)}\n*"${a.content}"*`);
      await interaction.reply({ embeds: [neutral(lines.join('\n\n'), 'Scheduled Announcements')], ephemeral: true });
    }
  },
};
