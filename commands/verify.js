'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const { verifyButton }  = require('../utils/buttonBuilder');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Set up verification')
      .addRoleOption(o => o.setName('role').setDescription('Role to grant on verify').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post verify panel').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Verify panel message')))
    .addSubcommand(s => s
      .setName('panel')
      .setDescription('Resend the verify panel to the configured channel'))
    .addSubcommand(s => s
      .setName('approve')
      .setDescription('Manually verify a user')
      .addUserOption(o => o.setName('user').setDescription('User to verify').setRequired(true)))
    .addSubcommand(s => s
      .setName('deny')
      .setDescription('Deny / un-verify a user')
      .addUserOption(o => o.setName('user').setDescription('User to deny').setRequired(true)))
    .addSubcommand(s => s
      .setName('log')
      .setDescription('Set the verify log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true))),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.verify;

    if (sub === 'setup') {
      const role    = interaction.options.getRole('role');
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message') || 'Click the button below to verify and gain access to the server.';

      cfg.enabled   = true;
      cfg.roleId    = role.id;
      cfg.channelId = channel.id;
      cfg.message   = message;
      await guildDoc.save();

      const embed = info(message, '✅ Verification');
      const row   = verifyButton();
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ embeds: [success(`Verification set up in <#${channel.id}>.\nVerified role: <@&${role.id}>`)], ephemeral: true });
    }

    else if (sub === 'panel') {
      if (!cfg.channelId) return interaction.reply({ content: 'No verify channel configured. Use `/verify setup` first.', ephemeral: true });
      const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!channel) return interaction.reply({ content: 'Verify channel not found.', ephemeral: true });
      const embed = info(cfg.message || 'Click the button below to verify.', '✅ Verification');
      await channel.send({ embeds: [embed], components: [verifyButton()] });
      await interaction.reply({ embeds: [success('Verify panel resent.')], ephemeral: true });
    }

    else if (sub === 'approve') {
      const user   = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
      if (cfg.roleId) {
        const role = interaction.guild.roles.cache.get(cfg.roleId);
        if (role) await member.roles.add(role);
      }
      await interaction.reply({ embeds: [success(`<@${user.id}> has been manually verified.`)], ephemeral: true });
    }

    else if (sub === 'deny') {
      const user   = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
      if (cfg.roleId) {
        const role = interaction.guild.roles.cache.get(cfg.roleId);
        if (role) await member.roles.remove(role);
      }
      await interaction.reply({ embeds: [success(`<@${user.id}> has been un-verified.`)], ephemeral: true });
    }

    else if (sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      cfg.logChannelId = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Verify logs will be sent to <#${channel.id}>.`)], ephemeral: true });
    }
  },
};
