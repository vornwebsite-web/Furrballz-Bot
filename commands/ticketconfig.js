'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require('../utils/embedBuilder');
const { noPermission, errorReply } = require('../utils/errors');
const { isManager }   = require('../utils/permissions');
const TicketConfig    = require('../models/TicketConfig');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('ticketconfig')
    .setDescription('Configure the ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s
      .setName('category')
      .setDescription('Set the Discord category for ticket channels')
      .addChannelOption(o => o.setName('category').setDescription('Category channel').setRequired(true)))

    // Support roles — add one at a time, up to 10 total
    .addSubcommand(s => s
      .setName('role')
      .setDescription('Add or remove a support role (max 10)')
      .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addRoleOption(o => o.setName('role').setDescription('Support role').setRequired(true)))

    .addSubcommand(s => s
      .setName('roles')
      .setDescription('View all configured support roles'))

    .addSubcommand(s => s
      .setName('log')
      .setDescription('Set the ticket log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))

    .addSubcommand(s => s
      .setName('limit')
      .setDescription('Set max open tickets per user')
      .addIntegerOption(o => o.setName('amount').setDescription('Max tickets (1-5)').setRequired(true).setMinValue(1).setMaxValue(5)))

    .addSubcommand(s => s
      .setName('message')
      .setDescription('Set the panel title and description')
      .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Panel description').setRequired(true)))

    .addSubcommand(s => s
      .setName('button')
      .setDescription('Set the open button label and emoji')
      .addStringOption(o => o.setName('label').setDescription('Button label').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Button emoji')))

    .addSubcommand(s => s
      .setName('autoclose')
      .setDescription('Auto-close inactive tickets after X hours (0 = disabled)')
      .addIntegerOption(o => o.setName('hours').setDescription('Hours of inactivity').setRequired(true).setMinValue(0).setMaxValue(168)))

    .addSubcommand(s => s
      .setName('status')
      .setDescription('View the full ticket config')),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);

    const sub = interaction.options.getSubcommand();
    const cfg = await TicketConfig.getOrCreate(interaction.guild.id);

    if (sub === 'category') {
      cfg.categoryId = interaction.options.getChannel('category').id;
      await cfg.save();
      await interaction.reply({ embeds: [success('Ticket channels will be created in that category.')], ephemeral: true });
    }

    else if (sub === 'role') {
      const action = interaction.options.getString('action');
      const role   = interaction.options.getRole('role');

      if (action === 'add') {
        if (cfg.supportRoleIds.includes(role.id)) {
          return errorReply(interaction, `<@&${role.id}> is already a support role.`);
        }
        if (cfg.supportRoleIds.length >= 10) {
          return errorReply(interaction, 'You already have 10 support roles configured. Remove one first.');
        }
        cfg.supportRoleIds.push(role.id);
        await cfg.save();
        await interaction.reply({ embeds: [success(`<@&${role.id}> added as support role. (${cfg.supportRoleIds.length}/10)`)], ephemeral: true });
      } else {
        if (!cfg.supportRoleIds.includes(role.id)) {
          return errorReply(interaction, `<@&${role.id}> is not a support role.`);
        }
        cfg.supportRoleIds = cfg.supportRoleIds.filter(id => id !== role.id);
        await cfg.save();
        await interaction.reply({ embeds: [success(`<@&${role.id}> removed from support roles. (${cfg.supportRoleIds.length}/10)`)], ephemeral: true });
      }
    }

    else if (sub === 'roles') {
      const list = cfg.supportRoleIds.length > 0
        ? cfg.supportRoleIds.map((id, i) => `${i + 1}. <@&${id}>`).join('\n')
        : 'No support roles configured.';
      await interaction.reply({
        embeds: [info(`${list}\n\n**${cfg.supportRoleIds.length}/10** roles used.`, 'Support Roles')],
        ephemeral: true,
      });
    }

    else if (sub === 'log') {
      cfg.logChannelId = interaction.options.getChannel('channel').id;
      await cfg.save();
      await interaction.reply({ embeds: [success(`Ticket logs → <#${cfg.logChannelId}>`)], ephemeral: true });
    }

    else if (sub === 'limit') {
      cfg.maxOpenPerUser = interaction.options.getInteger('amount');
      await cfg.save();
      await interaction.reply({ embeds: [success(`Max open tickets per user: **${cfg.maxOpenPerUser}**`)], ephemeral: true });
    }

    else if (sub === 'message') {
      cfg.panelTitle       = interaction.options.getString('title');
      cfg.panelDescription = interaction.options.getString('description');
      await cfg.save();
      await interaction.reply({ embeds: [success('Panel title and description updated.')], ephemeral: true });
    }

    else if (sub === 'button') {
      cfg.buttonLabel = interaction.options.getString('label');
      cfg.buttonEmoji = interaction.options.getString('emoji') || '🎫';
      await cfg.save();
      await interaction.reply({ embeds: [success(`Button: ${cfg.buttonEmoji} **${cfg.buttonLabel}**`)], ephemeral: true });
    }

    else if (sub === 'autoclose') {
      cfg.autoCloseHours = interaction.options.getInteger('hours');
      await cfg.save();
      await interaction.reply({
        embeds: [success(cfg.autoCloseHours === 0
          ? 'Auto-close disabled.'
          : `Tickets will auto-close after **${cfg.autoCloseHours}h** of inactivity.`,
        )],
        ephemeral: true,
      });
    }

    else if (sub === 'status') {
      const roleList = cfg.supportRoleIds.length > 0
        ? cfg.supportRoleIds.map(id => `<@&${id}>`).join(', ')
        : 'None';
      await interaction.reply({
        embeds: [info([
          `**Category:** ${cfg.categoryId ? `<#${cfg.categoryId}>` : 'Not set'}`,
          `**Log Channel:** ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Not set'}`,
          `**Max Open per User:** ${cfg.maxOpenPerUser}`,
          `**Auto-close:** ${cfg.autoCloseHours > 0 ? `${cfg.autoCloseHours}h` : 'Disabled'}`,
          `**Panel Title:** ${cfg.panelTitle}`,
          `**Button:** ${cfg.buttonEmoji} ${cfg.buttonLabel}`,
          `**Categories:** ${cfg.categories.length}`,
          `**Support Roles (${cfg.supportRoleIds.length}/10):** ${roleList}`,
        ].join('\n'), 'Ticket Config')],
        ephemeral: true,
      });
    }
  },
};
