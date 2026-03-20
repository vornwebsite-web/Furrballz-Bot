'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Builds a confirm/cancel action row.
 * @param {string} confirmId  - Custom ID for confirm button
 * @param {string} cancelId   - Custom ID for cancel button
 * @param {string} [confirmLabel='Confirm']
 * @param {string} [cancelLabel='Cancel']
 * @returns {ActionRowBuilder}
 */
function confirmCancel(confirmId, cancelId, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel(confirmLabel)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel(cancelLabel)
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * Builds the ticket panel button row.
 * @param {string} customId   - The button's custom ID (e.g. "ticket_open_general")
 * @param {string} label      - Button label
 * @param {string} [emoji]    - Optional emoji
 * @returns {ActionRowBuilder}
 */
function ticketOpenButton(customId, label, emoji) {
  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Primary);
  if (emoji) btn.setEmoji(emoji);
  return new ActionRowBuilder().addComponents(btn);
}

/**
 * Builds the ticket control row (claim / close / delete).
 * @param {string} prefix - Prefix for custom IDs, e.g. "ticket_123"
 * @returns {ActionRowBuilder}
 */
function ticketControls(prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_claim`)
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${prefix}_close`)
      .setLabel('Close')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${prefix}_delete`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * Builds a generic single button row.
 * @param {string} customId
 * @param {string} label
 * @param {ButtonStyle} style
 * @param {boolean} [disabled=false]
 * @param {string} [emoji]
 * @returns {ActionRowBuilder}
 */
function single(customId, label, style = ButtonStyle.Primary, disabled = false, emoji) {
  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled);
  if (emoji) btn.setEmoji(emoji);
  return new ActionRowBuilder().addComponents(btn);
}

/**
 * Builds the verify panel button.
 * @param {string} customId
 * @param {string} [label='Verify']
 * @returns {ActionRowBuilder}
 */
function verifyButton(customId = 'verify_click', label = 'Verify') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
}

module.exports = { confirmCancel, ticketOpenButton, ticketControls, single, verifyButton };
