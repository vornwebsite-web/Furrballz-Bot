'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission }      = require('../utils/errors');
const { isModerator, isManager }        = require('../utils/permissions');
const { paginate }   = require('../utils/paginator');
const { number }     = require('../utils/formatters');
const Warn = require('../models/Warn');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warning management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    .addSubcommand(s => s
      .setName('add')
      .setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(true)))

    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a specific warning by case ID')
      .addStringOption(o => o.setName('case_id').setDescription('Case ID to remove').setRequired(true)))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('View all warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))
      .addBooleanOption(o => o.setName('include_cleared').setDescription('Include cleared warnings')))

    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Clear all active warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User to clear').setRequired(true)))

    .addSubcommand(s => s
      .setName('info')
      .setDescription('View details of a specific case')
      .addStringOption(o => o.setName('case_id').setDescription('Case ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('top')
      .setDescription('View the most warned members in this server'))

    .addSubcommand(s => s
      .setName('recent')
      .setDescription('View the most recent warnings across the server')
      .addIntegerOption(o => o.setName('limit').setDescription('Number to show (default 10)').setMinValue(1).setMaxValue(25))),

  async execute(interaction) {
    if (!isModerator(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason');
      if (!target) return errorReply(interaction, 'User not found in this server.');
      if (target.user.bot) return errorReply(interaction, 'Cannot warn a bot.');
      if (target.id === interaction.user.id) return errorReply(interaction, 'Cannot warn yourself.');

      const warn      = await Warn.create({ userId: target.id, guildId: interaction.guild.id, moderatorId: interaction.user.id, reason });
      const warnCount = await Warn.countDocuments({ userId: target.id, guildId: interaction.guild.id, active: true });

      try { await target.send({ embeds: [info(`You have been warned in **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${warnCount}`)] }); } catch { /* DMs off */ }

      await interaction.reply({ embeds: [confirmEmbed({
        action:    'Member Warned',
        target:    `<@${target.id}> (${target.user.tag})`,
        moderator: `<@${interaction.user.id}>`,
        reason,
        caseId:    warn.caseId,
      }).addFields({ name: '⚠️ Total Warnings', value: `${warnCount}`, inline: true })], ephemeral: true });
    }

    else if (sub === 'remove') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const caseId = interaction.options.getString('case_id').toUpperCase();
      const warn   = await Warn.findOneAndUpdate({ caseId, guildId: interaction.guild.id }, { active: false }, { new: true });
      if (!warn) return errorReply(interaction, `Case \`${caseId}\` not found.`);
      await interaction.reply({ embeds: [success(`Warning \`${caseId}\` has been removed.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const target          = interaction.options.getUser('user');
      const includeCleared  = interaction.options.getBoolean('include_cleared') ?? false;
      const filter          = { userId: target.id, guildId: interaction.guild.id };
      if (!includeCleared) filter.active = true;

      const warns = await Warn.find(filter).sort({ createdAt: -1 });
      if (!warns.length) return interaction.reply({ embeds: [info(`**${target.tag}** has no ${includeCleared ? '' : 'active '}warnings.`)], ephemeral: true });

      const pages = [];
      const per   = 5;
      for (let i = 0; i < warns.length; i += per) {
        const slice = warns.slice(i, i + per);
        pages.push(neutral(
          slice.map(w => `\`${w.caseId}\` ${w.active ? '🟢' : '⚫'} **${w.reason}**\nMod: <@${w.moderatorId}> • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`).join('\n\n'),
          `Warnings — ${target.tag} (${warns.length} total)`,
        ));
      }
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'clear') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const target = interaction.options.getUser('user');
      const result = await Warn.updateMany({ userId: target.id, guildId: interaction.guild.id, active: true }, { active: false });
      await interaction.reply({ embeds: [success(`Cleared **${result.modifiedCount}** active warning(s) for **${target.tag}**.`)], ephemeral: true });
    }

    else if (sub === 'info') {
      const caseId = interaction.options.getString('case_id').toUpperCase();
      const warn   = await Warn.findOne({ caseId, guildId: interaction.guild.id });
      if (!warn) return errorReply(interaction, `Case \`${caseId}\` not found.`);
      await interaction.reply({
        embeds: [info([
          `**Case ID:** \`${warn.caseId}\``,
          `**User:** <@${warn.userId}>`,
          `**Moderator:** <@${warn.moderatorId}>`,
          `**Reason:** ${warn.reason}`,
          `**Status:** ${warn.active ? '🟢 Active' : '⚫ Cleared'}`,
          `**Date:** <t:${Math.floor(warn.createdAt.getTime() / 1000)}:F>`,
        ].join('\n'), `Case ${caseId}`)],
        ephemeral: true,
      });
    }

    else if (sub === 'top') {
      const pipeline = [
        { $match: { guildId: interaction.guild.id, active: true } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ];
      const results = await Warn.aggregate(pipeline);
      if (!results.length) return interaction.reply({ embeds: [info('No active warnings in this server.')], ephemeral: true });
      const lines = results.map((r, i) => `${i + 1}. <@${r._id}> — **${r.count}** warning(s)`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), 'Most Warned Members')] });
    }

    else if (sub === 'recent') {
      const limit = interaction.options.getInteger('limit') || 10;
      const warns = await Warn.find({ guildId: interaction.guild.id }).sort({ createdAt: -1 }).limit(limit);
      if (!warns.length) return interaction.reply({ embeds: [info('No warnings found.')], ephemeral: true });
      const lines = warns.map(w => `\`${w.caseId}\` <@${w.userId}> — ${w.reason.slice(0, 50)} • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), `Recent Warnings (${warns.length})`)] });
    }
  },
};
