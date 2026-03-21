'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const { resolveTemplate } = require('../services/welcomeService');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Welcome message configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set up the welcome message')
      .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Welcome message. Variables: {user} {username} {server} {count}').setRequired(true)))
    .addSubcommand(s => s.setName('disable').setDescription('Disable welcome messages'))
    .addSubcommand(s => s.setName('preview').setDescription('Preview the welcome message'))
    .addSubcommand(s => s
      .setName('setrole')
      .setDescription('Set a role to give new members')
      .addRoleOption(o => o.setName('role').setDescription('Role to assign on join').setRequired(true)))
    .addSubcommand(s => s
      .setName('setdm')
      .setDescription('Set a DM message for new members')
      .addStringOption(o => o.setName('message').setDescription('DM message (leave empty to disable)').setRequired(false))),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.welcome;

    if (sub === 'set') {
      cfg.enabled   = true;
      cfg.channelId = interaction.options.getChannel('channel').id;
      cfg.message   = interaction.options.getString('message');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Welcome messages enabled in <#${cfg.channelId}>.`)], ephemeral: true });
    }
    else if (sub === 'disable') {
      cfg.enabled = false;
      await guildDoc.save();
      await interaction.reply({ embeds: [success('Welcome messages disabled.')], ephemeral: true });
    }
    else if (sub === 'preview') {
      const preview = resolveTemplate(cfg.message || 'Welcome {user} to **{server}**!', interaction.member);
      await interaction.reply({ embeds: [info(preview, 'Welcome Message Preview')], ephemeral: true });
    }
    else if (sub === 'setrole') {
      cfg.roleId = interaction.options.getRole('role').id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`New members will receive <@&${cfg.roleId}> on join.`)], ephemeral: true });
    }
    else if (sub === 'setdm') {
      const msg    = interaction.options.getString('message');
      cfg.dmMessage = msg || null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(msg ? `DM message set.` : 'DM message disabled.')], ephemeral: true });
    }
  },
};
