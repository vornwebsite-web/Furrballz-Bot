'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events, InteractionType } = require('discord.js');
const logger    = require('../utils/logger');
const cooldown  = require('../utils/cooldown');
const { onCooldown, unknownError, errorReply } = require('../utils/errors');
const { isOwner } = require('../utils/permissions');
const BotConfig = require('../models/BotConfig');

// Button/select handlers (imported lazily to avoid circular deps)
const ticketService   = require('../services/ticketService');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {

    // ── Global blacklist & maintenance check ──────────────────────────────────
    try {
      const cfg = await BotConfig.get();

      if (cfg.blacklistedUsers.includes(interaction.user.id)) return;

      if (cfg.maintenance && !isOwner(interaction.user.id)) {
        return errorReply(interaction, cfg.maintenanceMessage, 'Maintenance Mode');
      }

      if (cfg.mode === 'private' && interaction.guildId) {
        if (
          !cfg.allowedGuilds.includes(interaction.guildId) &&
          !isOwner(interaction.user.id)
        ) {
          return errorReply(interaction, 'This bot is currently in private mode.', 'Private Mode');
        }
      }
    } catch (err) {
      logger.error(`[InteractionCreate] BotConfig check failed: ${err.message}`);
    }

    // ── Slash commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Cooldown check
      const remaining = cooldown.check(
        interaction.commandName,
        interaction.user.id,
        command.cooldown ?? 3000,
      );
      if (remaining > 0) return onCooldown(interaction, remaining);

      // Build sub-command string for logging
      let subCmd = '';
      try {
        const sub = interaction.options.getSubcommand(false);
        if (sub) subCmd = ` ${sub}`;
      } catch { /* no subcommand */ }

      const fullCmd = `/${interaction.commandName}${subCmd}`;
      const logCtx  = interaction.guild
        ? `[${interaction.guild.name}] #${interaction.channel?.name || '?'}`
        : '[DM]';

      try {
        await command.execute(interaction, client);

        // ── Command usage log ──────────────────────────────────────────────────
        logger.info(`[CMD] ${fullCmd} • ${interaction.user.tag} (${interaction.user.id}) • ${logCtx}`);

        // ── Log to Discord mod-log channel if configured ───────────────────────
        if (interaction.guild) {
          try {
            const Guild    = require('../models/Guild');
            const logService = require('../services/logService');
            const guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
            const channelId = guildDoc?.logChannels?.modAction;
            if (channelId) {
              await logService.send(client, channelId, {
                type:  'commandUse',
                color: 'info',
                title: 'Command Used',
                fields: [
                  { name: 'Command',  value: `\`${fullCmd}\``,                          inline: true  },
                  { name: 'User',     value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                  { name: 'Channel',  value: `<#${interaction.channel?.id}>`,           inline: true  },
                ],
              });
            }
          } catch { /* log failure never crashes command */ }
        }
      } catch (err) {
        logger.error(`[CMD] FAIL ${fullCmd} • ${interaction.user.tag} • ${err.message}`);
        logger.error(err.stack);
        await unknownError(interaction);
      }
      return;
    }

    // ── Autocomplete ──────────────────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction, client);
      } catch (err) {
        logger.error(`[Autocomplete] /${interaction.commandName} threw: ${err.message}`);
      }
      return;
    }

    // ── Button interactions ───────────────────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Ticket panel open button
      if (id.startsWith('ticket_open_')) {
        return ticketService.handleOpen(interaction, client);
      }
      // Ticket control buttons — format: ticket_<mongoId>_action
      if (id.startsWith('ticket_') && id.split('_').length === 3) {
        const action = id.split('_')[2];
        if (action === 'claim')   return ticketService.handleClaim(interaction, client);
        if (action === 'unclaim') return ticketService.handleUnclaim(interaction, client);
        if (action === 'close')   return ticketService.handleClose(interaction, client);
        if (action === 'delete')  return ticketService.handleDelete(interaction, client);
      }

      // Verify button
      if (id === 'verify_click') {
        const { default: verifyService } = await import('../services/verifyService.js').catch(() => ({ default: null }));
        if (verifyService) return verifyService.handleVerify(interaction, client);
      }

      return;
    }

    // ── Select menu interactions ──────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;

      if (id === 'ticket_category_select') {
        return ticketService.handleCategorySelect(interaction, client);
      }

      return;
    }

    // ── Modal submit interactions ─────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id.startsWith('ticket_modal_')) {
        return ticketService.handleModalSubmit(interaction, client);
      }

      return;
    }
  },
};
