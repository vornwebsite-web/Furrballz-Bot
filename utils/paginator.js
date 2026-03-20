'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const config = require('../config');

/**
 * Sends a paginated embed reply with next/prev/stop buttons.
 *
 * @param {import('discord.js').Interaction} interaction - Must be replied/deferred already
 * @param {import('discord.js').EmbedBuilder[]} pages     - Array of embeds (one per page)
 * @param {object} [options]
 * @param {number}  [options.timeout]   - Collector timeout in ms (default from config)
 * @param {boolean} [options.ephemeral] - Whether the reply is ephemeral
 */
async function paginate(interaction, pages, options = {}) {
  const timeout   = options.timeout   ?? config.limits.paginatorTimeout;
  const ephemeral = options.ephemeral ?? false;

  if (!pages || pages.length === 0) return;

  // Single page — no buttons needed
  if (pages.length === 1) {
    const payload = { embeds: [pages[0]], ephemeral };
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.reply(payload);
  }

  let current = 0;

  const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('page_first')
      .setLabel('«')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || current === 0),
    new ButtonBuilder()
      .setCustomId('page_prev')
      .setLabel('‹')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || current === 0),
    new ButtonBuilder()
      .setCustomId('page_stop')
      .setLabel('✕')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('page_next')
      .setLabel('›')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || current === pages.length - 1),
    new ButtonBuilder()
      .setCustomId('page_last')
      .setLabel('»')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || current === pages.length - 1),
  );

  const buildEmbed = () => {
    const embed = pages[current];
    // Append page number to footer if it has one
    const existingFooter = embed.data?.footer?.text || '';
    const pageText = `Page ${current + 1} / ${pages.length}`;
    embed.setFooter({
      text: existingFooter ? `${existingFooter} • ${pageText}` : pageText,
    });
    return embed;
  };

  const payload = { embeds: [buildEmbed()], components: [buildRow()], ephemeral };
  let msg;

  if (interaction.deferred || interaction.replied) {
    msg = await interaction.editReply(payload);
  } else {
    msg = await interaction.reply({ ...payload, fetchReply: true });
  }

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on('collect', async (i) => {
    switch (i.customId) {
      case 'page_first': current = 0;              break;
      case 'page_prev':  current = Math.max(0, current - 1);               break;
      case 'page_next':  current = Math.min(pages.length - 1, current + 1); break;
      case 'page_last':  current = pages.length - 1; break;
      case 'page_stop':  collector.stop('user'); return;
    }
    await i.update({ embeds: [buildEmbed()], components: [buildRow()] });
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [buildRow(true)] });
    } catch {
      // Message may have been deleted
    }
  });
}

module.exports = { paginate };
