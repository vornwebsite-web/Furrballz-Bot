'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager, isModerator }   = require('../utils/permissions');
const ticketService  = require('../services/ticketService');
const TicketConfig   = require('../models/TicketConfig');
const Ticket         = require('../models/Ticket');
const { paginate }   = require('../utils/paginator');

module.exports = {
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')

    .addSubcommand(s => s
      .setName('panel')
      .setDescription('Send the ticket panel to a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to send panel to').setRequired(true)))

    .addSubcommand(s => s
      .setName('open')
      .setDescription('Open a ticket manually'))

    .addSubcommand(s => s
      .setName('close')
      .setDescription('Close the current ticket'))

    .addSubcommand(s => s
      .setName('claim')
      .setDescription('Claim the current ticket'))

    .addSubcommand(s => s
      .setName('unclaim')
      .setDescription('Unclaim the current ticket'))

    .addSubcommand(s => s
      .setName('rename')
      .setDescription('Rename the current ticket channel')
      .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true)))

    .addSubcommand(s => s
      .setName('transcript')
      .setDescription('Generate a transcript of the current ticket'))

    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add a user to the current ticket')
      .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))

    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a user from the current ticket')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))

    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Force-delete the current ticket channel')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const channel = interaction.options.getChannel('channel');
      await interaction.deferReply({ ephemeral: true });
      const cfg = await TicketConfig.getOrCreate(interaction.guild.id);
      await ticketService.sendPanel(channel, cfg);
      await interaction.editReply({ embeds: [success(`Ticket panel sent to <#${channel.id}>.`)] });
    }

    else if (sub === 'open') {
      // Trigger the modal directly
      const cfg = await TicketConfig.getOrCreate(interaction.guild.id);
      const category = cfg.categories?.[0]?.value || 'general';
      const { ticketCreateModal } = require('../utils/modalBuilder');
      await interaction.showModal(ticketCreateModal(category));
    }

    else if (sub === 'close') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      if (ticket.status === 'closed') return errorReply(interaction, 'This ticket is already closed.');
      // Only opener, claimer, or moderators can close
      if (
        ticket.openerId !== interaction.user.id &&
        ticket.claimerId !== interaction.user.id &&
        !isModerator(interaction.member)
      ) return noPermission(interaction);
      await ticketService.handleClose(interaction, client);
    }

    else if (sub === 'claim') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      await ticketService.handleClaim(interaction, client);
    }

    else if (sub === 'unclaim') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      if (ticket.claimerId !== interaction.user.id && !isManager(interaction.member)) return noPermission(interaction);
      return ticketService.handleUnclaim(interaction, client);
    }

    else if (sub === 'rename') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const name   = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      await interaction.channel.setName(name);
      await interaction.reply({ embeds: [success(`Channel renamed to **${name}**.`)], ephemeral: true });
    }

    else if (sub === 'transcript') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      await interaction.deferReply({ ephemeral: true });
      const transcriptService = require('../services/transcriptService');
      await transcriptService.generate(interaction.channel, ticket, client);
      await interaction.editReply({ embeds: [success('Transcript generated and sent to the log channel.')] });
    }

    else if (sub === 'add') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const user   = interaction.options.getUser('user');
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel:      true,
        SendMessages:     true,
        ReadMessageHistory: true,
      });
      if (!ticket.addedUsers.includes(user.id)) {
        ticket.addedUsers.push(user.id);
        await ticket.save();
      }
      await interaction.reply({ embeds: [success(`<@${user.id}> has been added to this ticket.`)] });
    }

    else if (sub === 'remove') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const user   = interaction.options.getUser('user');
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return errorReply(interaction, 'This is not a ticket channel.');
      if (user.id === ticket.openerId) return errorReply(interaction, 'Cannot remove the ticket opener.');
      await interaction.channel.permissionOverwrites.delete(user.id);
      ticket.addedUsers = ticket.addedUsers.filter(id => id !== user.id);
      await ticket.save();
      await interaction.reply({ embeds: [success(`<@${user.id}> has been removed from this ticket.`)] });
    }

    else if (sub === 'delete') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      await ticketService.handleDelete(interaction, client);
    }
  },
};
