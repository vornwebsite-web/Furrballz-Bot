'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { v4: uuidv4 }    = require('uuid');
const Ticket            = require('../models/Ticket');
const TicketConfig      = require('../models/TicketConfig');
const { buildEmbed, COLORS } = require('../utils/embedBuilder');
const { ticketOpenButton }   = require('../utils/buttonBuilder');
const { ticketCreateModal }  = require('../utils/modalBuilder');
const { ticketCategorySelect } = require('../utils/selectBuilder');
const transcriptService = require('./transcriptService');
const logService        = require('./logService');
const logger            = require('../utils/logger');

// ── Panel embed ───────────────────────────────────────────────────────────────

function buildPanelEmbed(cfg) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`${cfg.buttonEmoji || '🎫'} ${cfg.panelTitle || 'Support Tickets'}`)
    .setDescription(
      `${cfg.panelDescription || 'Need help? Click the button below to open a support ticket.'}\n\n` +
      `**How it works:**\n` +
      `> 1. Click the button below\n` +
      `> 2. Fill in your subject and description\n` +
      `> 3. A private channel will be created for you\n` +
      `> 4. Our team will assist you shortly`,
    )
    .setFooter({ text: 'One ticket per issue please • Be descriptive for faster support' })
    .setTimestamp();
}

// ── Ticket channel info embed ─────────────────────────────────────────────────

function buildTicketEmbed(ticket, member, cfg) {
  const createdAt = Math.floor(Date.now() / 1000);

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({
      name:    `${member.user.tag}`,
      iconURL: member.user.displayAvatarURL({ size: 64 }),
    })
    .setTitle(`🎫 Ticket #${ticket.ticketId}`)
    .setDescription(
      `**${ticket.subject}**\n\n${ticket.description || '*No description provided.*'}`,
    )
    .addFields(
      { name: '👤 Opened by',  value: `<@${ticket.openerId}>`,      inline: true },
      { name: '📂 Category',   value: ticket.category,               inline: true },
      { name: '🆔 Ticket ID',  value: `\`${ticket.ticketId}\``,      inline: true },
      { name: '📅 Opened',     value: `<t:${createdAt}:F>`,          inline: true },
      { name: '🟢 Status',     value: 'Open — awaiting support',     inline: true },
      {
        name:   '📋 Support Roles',
        value:  cfg.supportRoleIds?.length > 0
          ? cfg.supportRoleIds.map(id => `<@&${id}>`).join(', ')
          : 'Not configured',
        inline: true,
      },
    )
    .setFooter({ text: 'Use the buttons below to manage this ticket' })
    .setTimestamp();
}

// ── Control button row ────────────────────────────────────────────────────────

function buildControlRow(ticketDbId, claimed = false, claimerId = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_claim`)
      .setLabel(claimed ? 'Claimed' : 'Claim')
      .setEmoji('🙋')
      .setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(!!claimed),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_unclaim`)
      .setLabel('Unclaim')
      .setEmoji('🔓')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!claimed),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_close`)
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_${ticketDbId}_delete`)
      .setLabel('Delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
  );
}

// ── Send panel ────────────────────────────────────────────────────────────────

async function sendPanel(channel, cfg) {
  const embed = buildPanelEmbed(cfg);

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

    const ticket = await Ticket.create({
      ticketId,
      guildId:     interaction.guild.id,
      channelId:   channel.id,
      openerId:    interaction.user.id,
      category,
      subject,
      description,
    });

    const pingRoleId = cfg.categories?.find(
      c => c.value === category.toLowerCase().replace(/\s+/g, '_')
    )?.pingRoleId;

    // Rich ticket embed
    const embed      = buildTicketEmbed(ticket, interaction.member, cfg);
    const controlRow = buildControlRow(ticket._id.toString(), false, null);

    // Welcome message at the top
    const welcomeEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setDescription(
        `👋 Welcome <@${interaction.user.id}>!\n\n` +
        `Your ticket **#${ticketId}** has been created. A member of the support team will be with you shortly.\n\n` +
        `Please describe your issue in as much detail as possible while you wait.`,
      );

    const content = pingRoleId ? `<@&${pingRoleId}>` : undefined;
    await channel.send({
      content,
      embeds:     [welcomeEmbed, embed],
      components: [controlRow],
      allowedMentions: { roles: pingRoleId ? [pingRoleId] : [] },
    });

    await interaction.editReply({
      content: `✅ Your ticket has been created: <#${channel.id}>\n**Ticket ID:** \`${ticketId}\``,
    });

    // Log
    if (cfg.logChannelId) {
      await logService.send(client, cfg.logChannelId, {
        type:  'ticketOpen',
        color: 'success',
        title: '🎫 Ticket Opened',
        fields: [
          { name: 'Ticket',    value: `#${ticketId}`,                inline: true },
          { name: 'User',      value: `<@${interaction.user.id}>`,   inline: true },
          { name: 'Category',  value: category,                       inline: true },
          { name: 'Channel',   value: `<#${channel.id}>`,            inline: true },
          { name: 'Subject',   value: subject,                        inline: false },
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

  const controlRow = buildControlRow(ticket._id.toString(), true, interaction.user.id);
  await interaction.message?.edit({ components: [controlRow] }).catch(() => {});

  await interaction.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription(`🙋 <@${interaction.user.id}> has **claimed** this ticket and will be assisting you.`)
      .setTimestamp()],
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

  await interaction.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.neutral)
      .setDescription(`🔓 <@${interaction.user.id}> has unclaimed this ticket. It is now open for any support member.`)
      .setTimestamp()],
  });
  await interaction.editReply({ content: '✅ Ticket unclaimed.' });
}

// ── Close ─────────────────────────────────────────────────────────────────────

async function handleClose(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.editReply({ content: '❌ Ticket not found.' });
  if (ticket.status === 'closed') return interaction.editReply({ content: '❌ Already closed.' });

  // Disable all buttons
  const disabledRow = buildControlRow(ticket._id.toString(), !!ticket.claimerId, ticket.claimerId);
  disabledRow.components.forEach(btn => btn.setDisabled(true));
  await interaction.message?.edit({ components: [disabledRow] }).catch(() => {});

  await interaction.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('🔒 Ticket Closed')
      .setDescription(
        `This ticket has been closed by <@${interaction.user.id}>.\n\n` +
        `A transcript is being generated. The channel will be deleted in **5 seconds**.`,
      )
      .addFields({ name: '🆔 Ticket ID', value: `\`${ticket.ticketId}\``, inline: true })
      .setTimestamp()],
  });

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

  await interaction.editReply({ content: '✅ Ticket closed.' });

  setTimeout(async () => {
    await interaction.channel.delete('[Ticket] Closed').catch(() => {});
  }, 5000);
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.error)
      .setDescription('🗑️ This channel is being deleted...')],
  });
  await interaction.editReply({ content: '🗑️ Deleting channel...' });
  setTimeout(async () => {
    await interaction.channel.delete('[Ticket] Force deleted').catch(() => {});
  }, 2000);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractTicketId(customId) {
  const parts = customId.split('_');
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
