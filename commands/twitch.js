'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }  = require('../utils/permissions');
const { paginate }   = require('../utils/paginator');
const SocialFeed     = require('../models/SocialFeed');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Twitch live notifier system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add a Twitch streamer to notify')
      .addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Notification channel').setRequired(true))
      .addRoleOption(o => o.setName('ping_role').setDescription('Role to ping when live'))
      .addStringOption(o => o.setName('message').setDescription('Custom live message')))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a Twitch notifier')
      .addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all Twitch notifiers'))
    .addSubcommand(s => s
      .setName('test')
      .setDescription('Send a test live notification')
      .addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true)))
    .addSubcommand(s => s
      .setName('message')
      .setDescription('Update the custom message for a notifier')
      .addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('New message').setRequired(true)))
    .addSubcommand(s => s
      .setName('role')
      .setDescription('Update the ping role for a notifier')
      .addStringOption(o => o.setName('username').setDescription('Twitch username').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('New role').setRequired(true))),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const handle  = interaction.options.getString('username').toLowerCase();
      const channel = interaction.options.getChannel('channel');
      const role    = interaction.options.getRole('ping_role');
      const message = interaction.options.getString('message');
      const exists  = await SocialFeed.findOne({ guildId: interaction.guild.id, platform: 'twitch', handle });
      if (exists) return errorReply(interaction, `Already tracking **${handle}** on Twitch.`);
      const feed = await SocialFeed.create({
        guildId: interaction.guild.id, channelId: channel.id,
        platform: 'twitch', handle, pingRoleId: role?.id || null, message: message || null,
      });
      await interaction.reply({ embeds: [success(`Twitch notifier added for **${handle}**!\nChannel: <#${channel.id}>\nID: \`${feed._id}\``)], ephemeral: true });
    }

    else if (sub === 'remove') {
      const handle = interaction.options.getString('username').toLowerCase();
      const feed   = await SocialFeed.findOneAndDelete({ guildId: interaction.guild.id, platform: 'twitch', handle });
      if (!feed) return errorReply(interaction, `No Twitch notifier for **${handle}**.`);
      await interaction.reply({ embeds: [success(`Twitch notifier for **${handle}** removed.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const feeds = await SocialFeed.find({ guildId: interaction.guild.id, platform: 'twitch' });
      if (!feeds.length) return interaction.reply({ embeds: [info('No Twitch notifiers set up.')], ephemeral: true });
      const lines = feeds.map(f => `**${f.handle}** → <#${f.channelId}>${f.pingRoleId ? ` | <@&${f.pingRoleId}>` : ''}${f.paused ? ' *(paused)*' : ''}`);
      await paginate(interaction, [neutral(lines.join('\n'), `Twitch Notifiers (${feeds.length})`)], { ephemeral: true });
    }

    else if (sub === 'test') {
      const handle = interaction.options.getString('username').toLowerCase();
      const feed   = await SocialFeed.findOne({ guildId: interaction.guild.id, platform: 'twitch', handle });
      if (!feed) return errorReply(interaction, `No Twitch notifier for **${handle}**.`);
      const ch = await interaction.client.channels.fetch(feed.channelId).catch(() => null);
      if (!ch) return errorReply(interaction, 'Notification channel not found.');
      const { buildEmbed } = require('../utils/embedBuilder');
      await ch.send({ embeds: [buildEmbed({ type: 'info', title: `🟣 [TEST] ${handle} is now live on Twitch!`, description: 'This is a test notification.' })] });
      await interaction.reply({ embeds: [success('Test notification sent.')], ephemeral: true });
    }

    else if (sub === 'message') {
      const handle  = interaction.options.getString('username').toLowerCase();
      const message = interaction.options.getString('message');
      const feed    = await SocialFeed.findOneAndUpdate({ guildId: interaction.guild.id, platform: 'twitch', handle }, { message });
      if (!feed) return errorReply(interaction, `No Twitch notifier for **${handle}**.`);
      await interaction.reply({ embeds: [success(`Custom message updated for **${handle}**.`)], ephemeral: true });
    }

    else if (sub === 'role') {
      const handle = interaction.options.getString('username').toLowerCase();
      const role   = interaction.options.getRole('role');
      const feed   = await SocialFeed.findOneAndUpdate({ guildId: interaction.guild.id, platform: 'twitch', handle }, { pingRoleId: role.id });
      if (!feed) return errorReply(interaction, `No Twitch notifier for **${handle}**.`);
      await interaction.reply({ embeds: [success(`Ping role for **${handle}** set to <@&${role.id}>.`)], ephemeral: true });
    }
  },
};
