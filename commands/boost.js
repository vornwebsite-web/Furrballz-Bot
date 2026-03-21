'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('boost')
    .setDescription('Server boost perks system')
    .addSubcommand(s => s.setName('perks').setDescription('View boost perks for this server'))
    .addSubcommand(s => s.setName('list').setDescription('List current boosters'))
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set up boost announcements and reward role in one command')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for boost announcements').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to give boosters'))
      .addStringOption(o => o.setName('message').setDescription('Boost message. Variables: {user} {server} {count}. Default provided if blank.')))
    .addSubcommand(s => s
      .setName('reward')
      .setDescription('Set the boost reward role')
      .addRoleOption(o => o.setName('role').setDescription('Role to give boosters').setRequired(true)))
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set the boost announcement channel and message')
      .addChannelOption(o => o.setName('channel').setDescription('Announcement channel').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Boost message. Variables: {user}, {server}, {count}').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Disable boost announcements')),

  async execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);

    if (sub === 'setup') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const channel = interaction.options.getChannel('channel');
      const role    = interaction.options.getRole('role');
      const message = interaction.options.getString('message') || '{user} just boosted **{server}**! 💎 We now have **{count}** boosts!';
      guildDoc.boostChannelId = channel.id;
      guildDoc.boostMessage   = message;
      if (role) guildDoc.boostRoleId = role.id;
      await guildDoc.save();

      const lines = [
        `✅ Boost announcements → <#${channel.id}>`,
        role ? `✅ Boost role → <@&${role.id}>` : `ℹ️ No boost role set (use \`/boost reward\` to add one)`,
        `✅ Message: *${message}*`,
      ];
      await interaction.reply({ embeds: [success(lines.join('\n'), '💎 Boost Setup Complete')], ephemeral: true });
    }

    else if (sub === 'perks') {
      const tier    = interaction.guild.premiumTier;
      const count   = interaction.guild.premiumSubscriptionCount;
      const perks   = {
        0: 'No boost perks yet.',
        1: '100 emoji slots, 128kbps audio, animated icon',
        2: '150 emoji slots, 256kbps audio, server banner, invite splash',
        3: '250 emoji slots, 384kbps audio, vanity URL, 1080p video',
      };
      await interaction.reply({ embeds: [info([
        `**Boost tier:** ${tier}`,
        `**Boosters:** ${count}`,
        `**Perks:** ${perks[tier] || 'Unknown'}`,
        `**Boost role:** ${guildDoc.boostChannelId ? 'Configured' : 'Not set'}`,
      ].join('\n'), '💎 Boost Perks')] });
    }

    else if (sub === 'list') {
      const boosters = interaction.guild.members.cache.filter(m => m.premiumSince);
      if (!boosters.size) return interaction.reply({ embeds: [info('No current boosters.')], ephemeral: true });
      const lines = [...boosters.values()].map(m => `<@${m.id}> — boosting since <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `Boosters (${boosters.size})`)] });
    }

    else if (sub === 'reward') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const role = interaction.options.getRole('role');
      guildDoc.boostRoleId = role.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Boost reward role set to <@&${role.id}>.\nThis role will be automatically assigned when a member boosts the server.`)], ephemeral: true });
    }

    else if (sub === 'set') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      guildDoc.boostChannelId = channel.id;
      guildDoc.boostMessage   = message;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Boost announcements will be sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'remove') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      guildDoc.boostChannelId = null;
      guildDoc.boostMessage   = null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success('Boost announcements disabled.')], ephemeral: true });
    }
  },
};
