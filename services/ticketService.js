'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { v4: uuidv4 }    = require('uuid');
const Ticket            = require('../models/Ticket');
const TicketConfig      = require('../models/TicketConfig');
const { buildEmbed }    = require('../utils/embedBuilder');
const { ticketOpenButton } = require('../utils/buttonBuilder');
const { ticketCreateModal } = require('../utils/modalBuilder');
const { ticketCategorySelect } = require('../utils/selectBuilder');
const transcriptService = require('./transcriptService');
const logService        = require('./logService');
const logger            = require('../utils/logger');

// ── Build the always-present claim/close/delete button row ───────────────────

function buildControlRow(ticketDbId, claimed = false, claimerId = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_claim`)
      .setLabel(claimed ? '✅ Claimed' : 'Claim')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!claimed),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_unclaim`)
      .setLabel('Unclaim')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!claimed),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_close`)
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_delete`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger),
  );
}

// ── Send panel ────────────────────────────────────────────────────────────────

async function sendPanel(channel, cfg) {
  const embed = buildEmbed({
    type:        'primary',
    title:       cfg.panelTitle       || 'Support Tickets',
    description: cfg.panelDescription || 'Click below to open a ticket.',
  });

  const components = cfg.categories?.length > 0
    ? [ticketCategorySelect(cfg.categories)]
    : [ticketOpenButton('ticket_open_general', cfg.buttonLabel || 'Open a Ticket', cfg.buttonEmoji || '🎫')];

  const msg = await channel.send({ embeds: [embed], components });

  cfg.panelChannelId = channel.id;
  cfg.panelMessageId = msg.id;
  await cfg.save();
}

// ── Handle panel button / select ──────────────────────────────────────────────

async function handleOpen(interaction, client) {
  const category = interaction.customId.replace('ticket_open_', '') || 'general';
  await interaction.showModal(ticketCreateModal(category));
}

async function handleCategorySelect(interaction, client) {
  const category = interaction.values[0];
  await interaction.showModal(ticketCreateModal(category));
}

async function handleModalSubmit(interaction, client) {
  const category    = interaction.customId.replace('ticket_modal_', '').replace(/_/g, ' ');
  const subject     = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');

  await interaction.deferReply({ ephemeral: true });

  const cfg = await TicketConfig.getOrCreate(interaction.guild.id);

  // Max open tickets check
  const openCount = await Ticket.countDocuments({
    guildId:  interaction.guild.id,
    openerId: interaction.user.id,
    status:   { $in: ['open', 'claimed'] },
  });

  if (openCount >= (cfg.maxOpenPerUser ?? 1)) {
    return interaction.editReply({
      content: `❌ You already have **${openCount}** open ticket(s). Please close existing ones first.`,
    });
  }

  const ticketId    = uuidv4().slice(0, 8).toUpperCase();
  const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticketId.toLowerCase()}`;

  try {
    const categoryChannel = cfg.categoryId
      ? interaction.guild.channels.cache.get(cfg.categoryId)
      : null;

    // Build permission overwrites — everyone denied, opener + bot + up to 10 support roles allowed
    const permOverwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id:    interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id:    client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      },
    ];

    // Add all support roles (up to 10)
    for (const roleId of (cfg.supportRoleIds || [])) {
      permOverwrites.push({
        id:    roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const channel = await interaction.guild.channels.create({
      name:                 channelName,
      type:                 ChannelType.GuildText,
      parent:               categoryChannel || undefined,
      permissionOverwrites: permOverwrites,
      reason:               `Ticket opened by ${interaction.user.tag}`,
    });

    // Save ticket doc first so we have the _id for button custom IDs
    const ticket = await Ticket.create({
      ticketId,
      guildId:     interaction.guild.id,
      channelId:   channel.id,
      openerId:    interaction.user.id,
      category,
      subject,
      description,
    });

    // Ticket info embed
    const pingRoleId = cfg.categories?.find(
      c => c.value === category.toLowerCase().replace(/\s+/g, '_')
    )?.pingRoleId;

    const embed = buildEmbed({
      type:        'primary',
      title:       `Ticket #${ticketId}`,
      description: `**Category:** ${category}\n**Subject:** ${subject}\n\n${description}`,
      fields: [
        { name: 'Opened by', value: `<@${interaction.user.id}>`,  inline: true },
        { name: 'Status',    value: '🟢 Open',                    inline: true },
        { name: 'Ticket ID', value: `\`${ticketId}\``,            inline: true },
      ],
    });

    // Control buttons — always visible: Claim | Unclaim | Close | Delete
    const controlRow = buildControlRow(ticket._id.toString(), false, null);

    const content = pingRoleId ? `<@&${pingRoleId}>` : undefined;
    await channel.send({
      content,
      embeds:     [embed],
      components: [controlRow],
      allowedMentions: { roles: pingRoleId ? [pingRoleId] : [] },
    });

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${channel.id}>` });

    // Log
    if (cfg.logChannelId) {
      await logService.send(client, cfg.logChannelId, {
        type:  'ticketOpen',
        color: 'success',
        title: 'Ticket Opened',
        fields: [
          { name: 'Ticket',   value: `#${ticketId}`,                inline: true },
          { name: 'User',     value: `<@${interaction.user.id}>`,   inline: true },
          { name: 'Category', value: category,                       inline: true },
          { name: 'Channel',  value: `<#${channel.id}>`,            inline: true },
        ],
      });
    }
  } catch (err) {
    logger.error(`[TicketService] Create failed: ${err.message}`);
    await interaction.editReply({ content: '❌ Failed to create ticket. Check my permissions.' });
  }
}

// ── Claim ─────────────────────────────────────────────────────────────────────

async function handleClaim(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const ticketId = extractTicketId(interaction.customId);
  const ticket   = await Ticket.findById(ticketId) || await Ticket.findOne({ channelId: interaction.channel.id });

  if (!ticket) return interaction.editReply({ content: '❌ Ticket not found.' });
  if (ticket.claimerId) return interaction.editReply({ content: `❌ Already claimed by <@${ticket.claimerId}>.` });

  ticket.claimerId = interaction.user.id;
  ticket.status    = 'claimed';
  await ticket.save();

  // Update control row to reflect claimed state
  const controlRow = buildControlRow(ticket._id.toString(), true, interaction.user.id);
  await interaction.message?.edit({ components: [controlRow] }).catch(() => {});

  await interaction.channel.send({
    content: `🎫 <@${interaction.user.id}> has **claimed** this ticket.`,
    allowedMentions: { users: [interaction.user.id] },
  });
  await interaction.editReply({ content: '✅ Ticket claimed.' });
}

// ── Unclaim ───────────────────────────────────────────────────────────────────

async function handleUnclaim(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.editReply({ content: '❌ Ticket not found.' });
  if (ticket.claimerId !== interaction.user.id) {
    return interaction.editReply({ content: '❌ You have not claimed this ticket.' });
  }

  ticket.claimerId = null;
  ticket.status    = 'open';
  await ticket.save();

  const controlRow = buildControlRow(ticket._id.toString(), false, null);
  await interaction.message?.edit({ components: [controlRow] }).catch(() => {});

  await interaction.channel.send({ content: `🔓 <@${interaction.user.id}> unclaimed this ticket.` });
  await interaction.editReply({ content: '✅ Ticket unclaimed.' });
}

// ── Close ─────────────────────────────────────────────────────────────────────

async function handleClose(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.editReply({ content: '❌ Ticket not found.' });
  if (ticket.status === 'closed') return interaction.editReply({ content: '❌ Already closed.' });

  // Disable all buttons while closing
  const disabledRow = buildControlRow(ticket._id.toString(), !!ticket.claimerId, ticket.claimerId);
  disabledRow.components.forEach(btn => btn.setDisabled(true));
  await interaction.message?.edit({ components: [disabledRow] }).catch(() => {});

  // Generate transcript
  try {
    await transcriptService.generate(interaction.channel, ticket, client);
  } catch (err) {
    logger.warn(`[TicketService] Transcript failed: ${err.message}`);
  }

  ticket.status     = 'closed';
  ticket.closedAt   = new Date();
  ticket.closedById = interaction.user.id;
  await ticket.save();

  await interaction.channel.send({ content: '🔒 Ticket closed. Deleting in 5 seconds...' });
  await interaction.editReply({ content: '✅ Ticket closed.' });

  setTimeout(async () => {
    await interaction.channel.delete('[Ticket] Closed').catch(() => {});
  }, 5000);
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply({ content: '🗑️ Deleting channel...' });
  setTimeout(async () => {
    await interaction.channel.delete('[Ticket] Force deleted').catch(() => {});
  }, 2000);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractTicketId(customId) {
  // customId format: ticket_<mongoId>_claim / ticket_<mongoId>_close etc
  const parts = customId.split('_');
  // parts[0] = 'ticket', parts[1] = mongoId, parts[2] = action
  return parts[1] || null;
}

module.exports = {
  sendPanel,
  handleOpen,
  handleCategorySelect,
  handleModalSubmit,
  handleClaim,
  handleUnclaim,
  handleClose,
  handleDelete,
  buildControlRow,
};
