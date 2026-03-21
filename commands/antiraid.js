'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const antiRaidService   = require('../services/antiRaidService');
const Guild             = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Anti-raid protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('enable').setDescription('Enable anti-raid'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable anti-raid'))
    .addSubcommand(s => s
      .setName('lockdown')
      .setDescription('Manually trigger or lift a server lockdown')
      .addBooleanOption(o => o.setName('active').setDescription('True to lock, false to unlock').setRequired(true)))
    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Set join threshold for raid detection')
      .addIntegerOption(o => o.setName('joins').setDescription('Max joins in window').setRequired(true).setMinValue(3).setMaxValue(100))
      .addIntegerOption(o => o.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(5).setMaxValue(60)))
    .addSubcommand(s => s
      .setName('action')
      .setDescription('Set action taken on raid detection')
      .addStringOption(o => o.setName('type').setDescription('Action').setRequired(true)
        .addChoices({ name: 'Lockdown', value: 'lockdown' }, { name: 'Alert Only', value: 'alert' })))
    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('Whitelist a role from raid checks')
      .addRoleOption(o => o.setName('role').setDescription('Role to whitelist').setRequired(true)))
    .addSubcommand(s => s.setName('status').setDescription('View anti-raid config')),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);

    if (!guildDoc.antiraid) guildDoc.antiraid = {};

    if (sub === 'enable')  { guildDoc.antiraid.enabled = true;  await guildDoc.save(); return interaction.reply({ embeds: [success('Anti-raid enabled.')],  ephemeral: true }); }
    if (sub === 'disable') { guildDoc.antiraid.enabled = false; await guildDoc.save(); return interaction.reply({ embeds: [success('Anti-raid disabled.')], ephemeral: true }); }

    if (sub === 'lockdown') {
      const active = interaction.options.getBoolean('active');
      await interaction.deferReply({ ephemeral: true });
      await antiRaidService.setLockdown(interaction.guild, active, client);
      await interaction.editReply({ embeds: [success(`Server ${active ? '🔒 locked down' : '🔓 unlocked'} successfully.`)] });
    }
    else if (sub === 'threshold') {
      guildDoc.antiraid.threshold = interaction.options.getInteger('joins');
      guildDoc.antiraid.windowMs  = interaction.options.getInteger('seconds') * 1000;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Raid threshold: **${guildDoc.antiraid.threshold}** joins in **${guildDoc.antiraid.windowMs / 1000}s**.`)], ephemeral: true });
    }
    else if (sub === 'action') {
      guildDoc.antiraid.action = interaction.options.getString('type');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Raid action set to **${guildDoc.antiraid.action}**.`)], ephemeral: true });
    }
    else if (sub === 'whitelist') {
      const role = interaction.options.getRole('role');
      if (!guildDoc.antiraid.whitelistRoles) guildDoc.antiraid.whitelistRoles = [];
      if (!guildDoc.antiraid.whitelistRoles.includes(role.id)) guildDoc.antiraid.whitelistRoles.push(role.id);
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`<@&${role.id}> whitelisted from raid checks.`)], ephemeral: true });
    }
    else if (sub === 'status') {
      const cfg = guildDoc.antiraid;
      await interaction.reply({ embeds: [info([
        `**Enabled:** ${cfg.enabled ? '🟢 Yes' : '🔴 No'}`,
        `**Threshold:** ${cfg.threshold || 10} joins / ${(cfg.windowMs || 10000) / 1000}s`,
        `**Action:** ${cfg.action || 'lockdown'}`,
        `**Alert Channel:** ${cfg.alertChannelId ? `<#${cfg.alertChannelId}>` : 'Not set'}`,
      ].join('\n'), 'Anti-Raid Status')], ephemeral: true });
    }
  },
};
