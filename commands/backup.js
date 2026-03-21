'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, warning } = require('../utils/embedBuilder');
const { errorReply, noPermission }      = require('../utils/errors');
const { isOwner, isManager }            = require('../utils/permissions');
const backupService = require('../services/backupService');
const Backup        = require('../models/Backup');
const { paginate }  = require('../utils/paginator');

module.exports = {
  cooldown: 5000,

  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Guild backup and restore system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a backup snapshot of this server')
      .addStringOption(o => o.setName('label').setDescription('Optional label for this backup')))

    .addSubcommand(s => s
      .setName('load')
      .setDescription('Restore server from a backup (DESTRUCTIVE if delete_existing is true)')
      .addStringOption(o => o.setName('id').setDescription('Backup ID to restore').setRequired(true))
      .addBooleanOption(o => o.setName('delete_existing').setDescription('Delete current channels/roles before restoring (default: false)')))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all saved backups for this server'))

    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Delete a saved backup')
      .addStringOption(o => o.setName('id').setDescription('Backup ID to delete').setRequired(true)))

    .addSubcommand(s => s
      .setName('info')
      .setDescription('View what a backup contains')
      .addStringOption(o => o.setName('id').setDescription('Backup ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('preview')
      .setDescription('Preview the diff between current server and a backup')
      .addStringOption(o => o.setName('id').setDescription('Backup ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('schedule')
      .setDescription('Set automatic backup schedule')
      .addStringOption(o => o.setName('interval').setDescription('Backup interval').setRequired(true)
        .addChoices(
          { name: 'Daily',    value: 'daily'  },
          { name: 'Weekly',   value: 'weekly' },
          { name: 'Disabled', value: 'off'    },
        ))),

  async execute(interaction, client) {
    // Only guild owner or bot owner can use backup
    if (interaction.user.id !== interaction.guild.ownerId && !isOwner(interaction.user.id)) {
      return noPermission(interaction);
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });
      const label  = interaction.options.getString('label');
      const backup = await backupService.create(interaction.guild, interaction.user.id, label);
      await interaction.editReply({
        embeds: [success(
          `Backup created!\n\n**ID:** \`${backup.backupId}\`\n**Roles saved:** ${backup.roles.length}\n**Channels saved:** ${backup.channels.length}${label ? `\n**Label:** ${label}` : ''}`,
          '💾 Backup Created',
        )],
      });
    }

    else if (sub === 'load') {
      const id              = interaction.options.getString('id').toUpperCase();
      const deleteExisting  = interaction.options.getBoolean('delete_existing') ?? false;

      if (deleteExisting) {
        // Extra confirmation — require owner only for destructive restore
        if (!isOwner(interaction.user.id) && interaction.user.id !== interaction.guild.ownerId) {
          return errorReply(interaction, 'Only the server owner can perform a destructive restore.');
        }
      }

      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ embeds: [warning(`Restoring backup \`${id}\`... This may take a while.`)] });

      const result = await backupService.load(interaction.guild, id, { deleteExisting });

      if (!result.success) return interaction.editReply({ embeds: [error(result.errors.join('\n') || 'Backup not found.')] });

      const errText = result.errors.length > 0 ? `\n\n**Errors (${result.errors.length}):**\n${result.errors.slice(0, 5).join('\n')}` : '';
      await interaction.editReply({ embeds: [success(`Backup \`${id}\` restored successfully.${errText}`)] });
    }

    else if (sub === 'list') {
      const backups = await Backup.find({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
      if (backups.length === 0) return interaction.reply({ embeds: [info('No backups found for this server.')], ephemeral: true });

      const lines  = backups.map(b =>
        `\`${b.backupId}\` — ${b.label || 'No label'} — ${b.roles.length} roles, ${b.channels.length} channels — <t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`
      );
      const pages  = [];
      for (let i = 0; i < lines.length; i += 5) {
        pages.push(info(lines.slice(i, i + 5).join('\n'), `Backups (${backups.length} total)`));
      }
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'delete') {
      const id     = interaction.options.getString('id').toUpperCase();
      const backup = await Backup.findOneAndDelete({ backupId: id, guildId: interaction.guild.id });
      if (!backup) return errorReply(interaction, `Backup \`${id}\` not found.`);
      await interaction.reply({ embeds: [success(`Backup \`${id}\` has been deleted.`)], ephemeral: true });
    }

    else if (sub === 'info') {
      const id     = interaction.options.getString('id').toUpperCase();
      const backup = await Backup.findOne({ backupId: id, guildId: interaction.guild.id });
      if (!backup) return errorReply(interaction, `Backup \`${id}\` not found.`);
      await interaction.reply({
        embeds: [info(
          [
            `**ID:** \`${backup.backupId}\``,
            `**Label:** ${backup.label || 'None'}`,
            `**Created by:** <@${backup.createdBy}>`,
            `**Created:** <t:${Math.floor(backup.createdAt.getTime() / 1000)}:F>`,
            `**Roles:** ${backup.roles.length}`,
            `**Channels:** ${backup.channels.length}`,
            `**Schedule:** ${backup.scheduledInterval || 'None'}`,
          ].join('\n'),
          `Backup Info — ${id}`,
        )],
        ephemeral: true,
      });
    }

    else if (sub === 'preview') {
      const id   = interaction.options.getString('id').toUpperCase();
      await interaction.deferReply({ ephemeral: true });
      const diff = await backupService.preview(interaction.guild, id);
      if (!diff) return interaction.editReply({ embeds: [error(`Backup \`${id}\` not found.`)] });

      await interaction.editReply({
        embeds: [info(
          [
            `**Backup:** \`${id}\` — ${diff.label || 'No label'}`,
            `**Date:** <t:${Math.floor(diff.backupDate.getTime() / 1000)}:R>`,
            '',
            `**Roles to add (${diff.rolesToAdd.length}):** ${diff.rolesToAdd.slice(0, 10).join(', ') || 'None'}`,
            `**Roles to remove (${diff.rolesToRemove.length}):** ${diff.rolesToRemove.slice(0, 10).join(', ') || 'None'}`,
            `**Channels to add (${diff.channelsToAdd.length}):** ${diff.channelsToAdd.slice(0, 10).join(', ') || 'None'}`,
            `**Channels to remove (${diff.channelsToRemove.length}):** ${diff.channelsToRemove.slice(0, 10).join(', ') || 'None'}`,
          ].join('\n'),
          'Backup Preview',
        )],
      });
    }

    else if (sub === 'schedule') {
      const interval = interaction.options.getString('interval');
      await Backup.updateMany(
        { guildId: interaction.guild.id },
        { $set: { scheduledInterval: interval === 'off' ? null : interval } },
      );
      await interaction.reply({
        embeds: [success(interval === 'off'
          ? 'Automatic backups have been **disabled**.'
          : `Automatic backups set to **${interval}**.`,
        )],
        ephemeral: true,
      });
    }
  },
};
