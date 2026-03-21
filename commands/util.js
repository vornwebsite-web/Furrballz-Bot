'use strict';

const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { number, ms: fmtMs } = require('../utils/formatters');
const os = require('os');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('Utility and information commands')
    .addSubcommand(s => s.setName('serverinfo').setDescription('View information about this server'))
    .addSubcommand(s => s
      .setName('userinfo')
      .setDescription('View information about a user')
      .addUserOption(o => o.setName('user').setDescription('User to check')))
    .addSubcommand(s => s
      .setName('avatar')
      .setDescription('Get a user\'s avatar')
      .addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s
      .setName('banner')
      .setDescription('Get a user\'s banner')
      .addUserOption(o => o.setName('user').setDescription('User')))
    .addSubcommand(s => s.setName('ping').setDescription('Check bot latency'))
    .addSubcommand(s => s.setName('uptime').setDescription('Check bot uptime'))
    .addSubcommand(s => s.setName('stats').setDescription('View bot statistics')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'serverinfo') {
      const g = interaction.guild;
      await interaction.reply({ embeds: [info([
        `**Name:** ${g.name}`,
        `**ID:** \`${g.id}\``,
        `**Owner:** <@${g.ownerId}>`,
        `**Members:** ${number(g.memberCount)}`,
        `**Channels:** ${g.channels.cache.size}`,
        `**Roles:** ${g.roles.cache.size}`,
        `**Emojis:** ${g.emojis.cache.size}`,
        `**Boosts:** ${g.premiumSubscriptionCount} (Tier ${g.premiumTier})`,
        `**Verification:** ${g.verificationLevel}`,
        `**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:F>`,
      ].join('\n'), g.name).setThumbnail(g.iconURL({ size: 256 }))] });
    }

    else if (sub === 'userinfo') {
      const user   = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);
      const roles  = member?.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None';
      await interaction.reply({ embeds: [info([
        `**Tag:** ${user.tag}`,
        `**ID:** \`${user.id}\``,
        `**Bot:** ${user.bot ? 'Yes' : 'No'}`,
        `**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
        ...(member ? [
          `**Joined server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          `**Nickname:** ${member.nickname || 'None'}`,
          `**Roles (${member.roles.cache.size - 1}):** ${roles.slice(0, 500)}`,
        ] : []),
      ].join('\n'), `User Info — ${user.username}`).setThumbnail(user.displayAvatarURL({ size: 256 }))] });
    }

    else if (sub === 'avatar') {
      const user = interaction.options.getUser('user') || interaction.user;
      await interaction.reply({ embeds: [neutral(null, `${user.username}'s Avatar`).setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))] });
    }

    else if (sub === 'banner') {
      const user = await (interaction.options.getUser('user') || interaction.user).fetch();
      if (!user.banner) return interaction.reply({ content: 'This user has no banner.', ephemeral: true });
      await interaction.reply({ embeds: [neutral(null, `${user.username}'s Banner`).setImage(user.bannerURL({ size: 1024, dynamic: true }))] });
    }

    else if (sub === 'ping') {
      const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
      await interaction.editReply({ content: null, embeds: [info([
        `**Websocket heartbeat:** ${client.ws.ping}ms`,
        `**Roundtrip latency:** ${sent.createdTimestamp - interaction.createdTimestamp}ms`,
      ].join('\n'), '🏓 Pong!')] });
    }

    else if (sub === 'uptime') {
      const upMs = process.uptime() * 1000;
      await interaction.reply({ embeds: [info(`Bot has been online for **${fmtMs(upMs)}**.`, '⏱️ Uptime')] });
    }

    else if (sub === 'stats') {
      const mem = process.memoryUsage();
      await interaction.reply({ embeds: [info([
        `**Servers:** ${number(client.guilds.cache.size)}`,
        `**Users:** ${number(client.users.cache.size)}`,
        `**Channels:** ${number(client.channels.cache.size)}`,
        `**Commands:** ${client.commands.size}`,
        `**Uptime:** ${fmtMs(process.uptime() * 1000)}`,
        `**Memory (heap):** ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        `**Node.js:** ${process.version}`,
        `**discord.js:** v${djsVersion}`,
        `**Platform:** ${os.type()} ${os.arch()}`,
      ].join('\n'), '📊 Bot Statistics')] });
    }
  },
};
