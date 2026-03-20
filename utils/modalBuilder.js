'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

/**
 * Builds the ticket creation modal.
 * @param {string} category - Ticket category name
 * @returns {ModalBuilder}
 */
function ticketCreateModal(category) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${category.toLowerCase().replace(/\s+/g, '_')}`)
    .setTitle(`Open a Ticket — ${category}`);

  const subject = new TextInputBuilder()
    .setCustomId('ticket_subject')
    .setLabel('Subject')
    .setPlaceholder('Brief summary of your issue')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const description = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Description')
    .setPlaceholder('Describe your issue in detail...')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subject),
    new ActionRowBuilder().addComponents(description),
  );

  return modal;
}

/**
 * Builds the suggestion submission modal.
 * @returns {ModalBuilder}
 */
function suggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId('suggest_modal')
    .setTitle('Submit a Suggestion');

  const input = new TextInputBuilder()
    .setCustomId('suggest_content')
    .setLabel('Your Suggestion')
    .setPlaceholder('Describe your suggestion clearly...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(20)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

/**
 * Builds the appeal submission modal.
 * @param {string} caseId - The case ID being appealed
 * @returns {ModalBuilder}
 */
function appealModal(caseId) {
  const modal = new ModalBuilder()
    .setCustomId(`appeal_modal_${caseId}`)
    .setTitle('Submit an Appeal');

  const reason = new TextInputBuilder()
    .setCustomId('appeal_reason')
    .setLabel('Why should your punishment be removed?')
    .setPlaceholder('Explain your situation honestly...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(30)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reason));
  return modal;
}

/**
 * Builds the embed creation modal.
 * @returns {ModalBuilder}
 */
function embedModal() {
  const modal = new ModalBuilder()
    .setCustomId('embed_create_modal')
    .setTitle('Create an Embed');

  const title = new TextInputBuilder()
    .setCustomId('embed_title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(256)
    .setRequired(false);

  const description = new TextInputBuilder()
    .setCustomId('embed_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(true);

  const color = new TextInputBuilder()
    .setCustomId('embed_color')
    .setLabel('Color (hex, e.g. #7F77DD)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(7)
    .setRequired(false)
    .setPlaceholder('#7F77DD');

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(color),
  );

  return modal;
}

/**
 * Builds the tag creation modal.
 * @returns {ModalBuilder}
 */
function tagModal() {
  const modal = new ModalBuilder()
    .setCustomId('tag_create_modal')
    .setTitle('Create a Tag');

  const name = new TextInputBuilder()
    .setCustomId('tag_name')
    .setLabel('Tag Name')
    .setPlaceholder('e.g. rules, info, faq')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(32)
    .setRequired(true);

  const content = new TextInputBuilder()
    .setCustomId('tag_content')
    .setLabel('Tag Content')
    .setPlaceholder('What this tag should display when used')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(2000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(content),
  );

  return modal;
}

module.exports = {
  ticketCreateModal,
  suggestionModal,
  appealModal,
  embedModal,
  tagModal,
};
