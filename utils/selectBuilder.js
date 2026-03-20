'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

/**
 * Builds a generic string select menu.
 * @param {string} customId
 * @param {string} placeholder
 * @param {Array<{ label: string, value: string, description?: string, emoji?: string, default?: boolean }>} optionsArray
 * @param {number} [minValues=1]
 * @param {number} [maxValues=1]
 * @returns {ActionRowBuilder}
 */
function stringSelect(customId, placeholder, optionsArray, minValues = 1, maxValues = 1) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues);

  const built = optionsArray.map((opt) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(opt.label)
      .setValue(opt.value);
    if (opt.description) option.setDescription(opt.description);
    if (opt.emoji)       option.setEmoji(opt.emoji);
    if (opt.default)     option.setDefault(true);
    return option;
  });

  select.addOptions(built);
  return new ActionRowBuilder().addComponents(select);
}

/**
 * Builds a ticket category select menu from a TicketConfig categories array.
 * @param {Array<{ label: string, value: string, description?: string, emoji?: string }>} categories
 * @returns {ActionRowBuilder}
 */
function ticketCategorySelect(categories) {
  return stringSelect(
    'ticket_category_select',
    'Select a ticket category...',
    categories.map((c) => ({
      label:       c.label,
      value:       c.value,
      description: c.description || null,
      emoji:       c.emoji       || null,
    })),
  );
}

/**
 * Builds a role select placeholder (for dashboard-driven flows using string IDs).
 * @param {string} customId
 * @param {Array<{ id: string, name: string }>} roles
 * @returns {ActionRowBuilder}
 */
function roleSelect(customId, roles) {
  return stringSelect(
    customId,
    'Select a role...',
    roles.map((r) => ({ label: r.name, value: r.id })),
  );
}

/**
 * Builds a punishment select for antinuke/automod.
 * @param {string} customId
 * @param {string} [current] - Currently selected value
 * @returns {ActionRowBuilder}
 */
function punishmentSelect(customId, current) {
  const options = [
    { label: 'Ban',        value: 'ban',        description: 'Permanently ban the attacker',       emoji: '🔨' },
    { label: 'Kick',       value: 'kick',       description: 'Kick the attacker from the server',  emoji: '👢' },
    { label: 'Strip Roles',value: 'strip',      description: 'Remove all roles from the attacker', emoji: '🪄' },
    { label: 'De-Owner',   value: 'deowner',    description: 'Remove admin/manage-guild perms',    emoji: '👑' },
    { label: 'Timeout',    value: 'timeout',    description: 'Timeout the attacker for 24h',       emoji: '⏰' },
  ];

  if (current) {
    options.forEach((o) => { if (o.value === current) o.default = true; });
  }

  return stringSelect(customId, 'Select punishment...', options);
}

module.exports = { stringSelect, ticketCategorySelect, roleSelect, punishmentSelect };
