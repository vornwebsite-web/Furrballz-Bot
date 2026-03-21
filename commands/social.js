'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager, isModerator }   = require('../utils/permissions');
const { paginate } = require('../utils/paginator');
const SocialFeed   = require('../models/SocialFeed');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('Social media notifier system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add a social feed to notify')
      .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true)
        .addChoices({ name: 'YouTube', value: 'youtube' }, { name: 'TikTok', value: 'tiktok' }, { name: 'Instagram', value: 'instagram' }))
      .addStringOption(o => o.setName('handle').setDescription('Username/channel ID').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Notification channel').setRequired(true))
      .addRoleOption(o => o.setName('ping_role').setDescription('Role to ping on new post'))
      .addStringOption(o => o.setName('message').setDescription('Custom notification message')))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a social feed')
      .addStringOption(o => o.setName('id').setDescription('Feed ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all social feeds'))
    .addSubcommand(s => s
      .setName('test')
      .setDescription('Trigger a test notification for a feed')
      .addStringOption(o => o.setName('id').setDescription('Feed ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('pause')
      .setDescription('Pause a feed')
      .addStringOption(o => o.setName('id').setDescription('Feed ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('resume')
      .setDescription('Resume a paused feed')
      .addStringOption(o => o.setName('id').setDescription('Feed ID').setRequired(true))),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const platform = interaction.options.getString('platform');
      const handle   = interaction.options.getString('handle');
      const channel  = interaction.options.getChannel('channel');
      const role     = interaction.options.getRole('ping_role');
      const message  = interaction.options.getString('message');

      const existing = await SocialFeed.findOne({ guildId: interaction.guild.id, platform, handle });
      if (existing) return errorReply(interaction, `A feed for **@${handle}** on ${platform} already exists.`);

      const feed = await SocialFeed.create({
        guildId: interaction.guild.id, channelId: channel.id,
        platform, handle, pingRoleId: role?.id || null, message: message || null,
      });
      await interaction.reply({ embeds: [success(`**${platform}** feed for **@${handle}** added!\nNotifications → <#${channel.id}>\nID: \`${feed._id}\``)], ephemeral: true });
    }

    else if (sub === 'remove') {
      const id   = interaction.options.getString('id');
      const feed = await SocialFeed.findOneAndDelete({ _id: id, guildId: interaction.guild.id });
      if (!feed) return errorReply(interaction, 'Feed not found.');
      await interaction.reply({ embeds: [success(`Feed **${feed.platform}/@${feed.handle}** removed.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const feeds = await SocialFeed.find({ guildId: interaction.guild.id });
      if (!feeds.length) return interaction.reply({ embeds: [info('No social feeds set up.')], ephemeral: true });
      const lines = feeds.map(f => `\`${f._id}\` **${f.platform}** @${f.handle} → <#${f.channelId}>${f.paused ? ' *(paused)*' : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), 'Social Feeds'));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'test') {
      const id   = interaction.options.getString('id');
      const feed = await SocialFeed.findOne({ _id: id, guildId: interaction.guild.id });
      if (!feed) return errorReply(interaction, 'Feed not found.');
      const { notify } = require('../services/socialPoller');
      await notify(feed, client, {
        platform: feed.platform, color: 'info',
        title: `🧪 Test Notification — ${feed.platform} @${feed.handle}`,
        description: 'This is a test notification.',
      });
      await interaction.reply({ embeds: [success('Test notification sent.')], ephemeral: true });
    }

    else if (sub === 'pause') {
      const feed = await SocialFeed.findOneAndUpdate({ _id: interaction.options.getString('id'), guildId: interaction.guild.id }, { paused: true });
      if (!feed) return errorReply(interaction, 'Feed not found.');
      await interaction.reply({ embeds: [success('Feed paused.')], ephemeral: true });
    }

    else if (sub === 'resume') {
      const feed = await SocialFeed.findOneAndUpdate({ _id: interaction.options.getString('id'), guildId: interaction.guild.id }, { paused: false });
      if (!feed) return errorReply(interaction, 'Feed not found.');
      await interaction.reply({ embeds: [success('Feed resumed.')], ephemeral: true });
    }
  },
};
