'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { success, error, info, neutral, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission, botNoPermission } = require('../utils/errors');
const { isOwner, isModerator, canModerate } = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');
const { paginate }        = require('../utils/paginator');
const { ms: fmtMs }       = require('../utils/formatters');
const Warn    = require('../models/Warn');
const Mute    = require('../models/Mute');
const Guild   = require('../models/Guild');
const logService = require('../services/logService');

module.exports = {
  cooldown: 3000,

  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    // ── ban ──────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('ban')
      .setDescription('Ban a member from the server')
      .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for ban'))
      .addIntegerOption(o => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)))

    // ── kick ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for kick')))

    // ── warn ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('warn')
      .setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(true)))

    // ── mute ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('mute')
      .setDescription('Timeout (mute) a member')
      .addUserOption(o => o.setName('user').setDescription('User to mute').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h, 1d').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for mute')))

    // ── unmute ────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('unmute')
      .setDescription('Remove timeout from a member')
      .addUserOption(o => o.setName('user').setDescription('User to unmute').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))

    // ── timeout (alias of mute with explicit duration) ────────────────────────
    .addSubcommand(s => s
      .setName('timeout')
      .setDescription('Timeout a member (alias of mute)')
      .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))

    // ── purge ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('purge')
      .setDescription('Bulk delete messages')
      .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user')))

    // ── lock ──────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('lock')
      .setDescription('Lock or unlock a channel')
      .addBooleanOption(o => o.setName('locked').setDescription('True to lock, false to unlock').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)')))

    // ── slowmode ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('slowmode')
      .setDescription('Set slowmode in a channel')
      .addStringOption(o => o.setName('duration').setDescription('Slowmode duration e.g. 5s, 1m (0 to disable)').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel')))

    // ── case ──────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('case')
      .setDescription('View a mod case by ID')
      .addStringOption(o => o.setName('id').setDescription('Case ID').setRequired(true)))

    // ── history ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('history')
      .setDescription('View warn history for a user')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)))

    // ── clearwarns ────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('clearwarns')
      .setDescription('Clear all warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User to clear').setRequired(true))),

  // ── execute ────────────────────────────────────────────────────────────────
  async execute(interaction, client) {
    const sub    = interaction.options.getSubcommand();
    const guild  = interaction.guild;
    const guildDoc = await Guild.getOrCreate(guild.id);

    // ── Helper to log mod action ────────────────────────────────────────────
    async function logAction(type, target, reason, extra = []) {
      if (!guildDoc.logChannels?.modAction) return;
      await logService.send(client, guildDoc.logChannels.modAction, {
        type:  'modAction',
        color: 'warning',
        title: `Mod Action — ${type}`,
        thumbnail: target?.displayAvatarURL?.() || null,
        fields: [
          { name: 'User',      value: `<@${target.id}> (${target.tag || target.user?.tag})`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason',    value: reason || 'No reason provided', inline: false },
          ...extra,
        ],
      });
    }

    // ── ban ─────────────────────────────────────────────────────────────────
    if (sub === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return noPermission(interaction);
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days   = interaction.options.getInteger('delete_days') ?? 0;
      if (!target) return errorReply(interaction, 'User not found in this server.');
      const { allowed, reason: blockReason } = canModerate(interaction.member, target, guild);
      if (!allowed) return errorReply(interaction, blockReason);
      await interaction.deferReply({ ephemeral: true });
      try {
        await guild.members.ban(target, { reason: `[${interaction.user.tag}] ${reason}`, deleteMessageDays: days });
        await interaction.editReply({ embeds: [confirmEmbed({ action: 'Member Banned', target: `<@${target.id}> (${target.user.tag})`, moderator: `<@${interaction.user.id}>`, reason })] });
        await logAction('Ban', target.user, reason);
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed to ban: ${err.message}`)] });
      }
    }

    // ── kick ────────────────────────────────────────────────────────────────
    else if (sub === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return noPermission(interaction);
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return errorReply(interaction, 'User not found in this server.');
      const { allowed, reason: blockReason } = canModerate(interaction.member, target, guild);
      if (!allowed) return errorReply(interaction, blockReason);
      await interaction.deferReply({ ephemeral: true });
      try {
        await target.kick(`[${interaction.user.tag}] ${reason}`);
        await interaction.editReply({ embeds: [confirmEmbed({ action: 'Member Kicked', target: `<@${target.id}> (${target.user.tag})`, moderator: `<@${interaction.user.id}>`, reason })] });
        await logAction('Kick', target.user, reason);
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed to kick: ${err.message}`)] });
      }
    }

    // ── warn ────────────────────────────────────────────────────────────────
    else if (sub === 'warn') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason');
      if (!target) return errorReply(interaction, 'User not found in this server.');
      const { allowed, reason: blockReason } = canModerate(interaction.member, target, guild);
      if (!allowed) return errorReply(interaction, blockReason);
      await interaction.deferReply({ ephemeral: true });
      const warn = await Warn.create({
        userId: target.id, guildId: guild.id,
        moderatorId: interaction.user.id, reason,
      });
      const warnCount = await Warn.countDocuments({ userId: target.id, guildId: guild.id, active: true });
      try {
        await target.send({ embeds: [info(`You have been warned in **${guild.name}**.\nReason: ${reason}\nTotal warnings: ${warnCount}`)] }).catch(() => {});
      } catch { /* DMs disabled */ }
      await interaction.editReply({ embeds: [success(`**${target.user.tag}** has been warned. (Case: \`${warn.caseId}\`)\nTotal warnings: **${warnCount}**`)] });
      await logAction('Warn', target.user, reason, [{ name: 'Case ID', value: warn.caseId, inline: true }, { name: 'Total Warns', value: String(warnCount), inline: true }]);
    }

    // ── mute / timeout ───────────────────────────────────────────────────────
    else if (sub === 'mute' || sub === 'timeout') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return noPermission(interaction);
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const durStr = interaction.options.getString('duration');
      if (!target) return errorReply(interaction, 'User not found in this server.');
      const { allowed, reason: blockReason } = canModerate(interaction.member, target, guild);
      if (!allowed) return errorReply(interaction, blockReason);
      const dur = parseWithBounds(durStr, { max: 28 * 24 * 60 * 60 * 1000, label: 'mute duration' });
      if (!dur.valid) return errorReply(interaction, dur.reason);
      await interaction.deferReply({ ephemeral: true });
      try {
        await target.timeout(dur.ms, `[${interaction.user.tag}] ${reason}`);
        await interaction.editReply({ embeds: [success(`**${target.user.tag}** has been muted for **${fmtMs(dur.ms)}**.\nReason: ${reason}`)] });
        await logAction('Mute', target.user, reason, [{ name: 'Duration', value: fmtMs(dur.ms), inline: true }]);
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed to mute: ${err.message}`)] });
      }
    }

    // ── unmute ───────────────────────────────────────────────────────────────
    else if (sub === 'unmute') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return noPermission(interaction);
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return errorReply(interaction, 'User not found in this server.');
      await interaction.deferReply({ ephemeral: true });
      try {
        await target.timeout(null, `[${interaction.user.tag}] ${reason}`);
        await interaction.editReply({ embeds: [success(`**${target.user.tag}**'s timeout has been removed.`)] });
        await logAction('Unmute', target.user, reason);
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed to unmute: ${err.message}`)] });
      }
    }

    // ── purge ────────────────────────────────────────────────────────────────
    else if (sub === 'purge') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return noPermission(interaction);
      const amount    = interaction.options.getInteger('amount');
      const filterUser = interaction.options.getUser('user');
      await interaction.deferReply({ ephemeral: true });
      try {
        let messages = await interaction.channel.messages.fetch({ limit: 100 });
        if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
        const toDelete = [...messages.values()].slice(0, amount);
        const deleted  = await interaction.channel.bulkDelete(toDelete, true);
        await interaction.editReply({ embeds: [success(`Deleted **${deleted.size}** message(s).`)] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed to purge: ${err.message}`)] });
      }
    }

    // ── lock ─────────────────────────────────────────────────────────────────
    else if (sub === 'lock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return noPermission(interaction);
      const locked  = interaction.options.getBoolean('locked');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await interaction.deferReply({ ephemeral: true });
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: locked ? false : null });
        await interaction.editReply({ embeds: [success(`<#${channel.id}> has been **${locked ? 'locked' : 'unlocked'}**.`)] });
        await channel.send({ embeds: [info(`This channel has been **${locked ? 'locked' : 'unlocked'}** by <@${interaction.user.id}>.`)] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    // ── slowmode ──────────────────────────────────────────────────────────────
    else if (sub === 'slowmode') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return noPermission(interaction);
      const durStr  = interaction.options.getString('duration');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await interaction.deferReply({ ephemeral: true });
      const seconds = durStr === '0' ? 0 : Math.floor((parseWithBounds(durStr, { max: 6 * 60 * 60 * 1000 }).ms || 0) / 1000);
      try {
        await channel.setRateLimitPerUser(seconds);
        await interaction.editReply({ embeds: [success(seconds === 0 ? `Slowmode disabled in <#${channel.id}>.` : `Slowmode set to **${seconds}s** in <#${channel.id}>.`)] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    // ── case ─────────────────────────────────────────────────────────────────
    else if (sub === 'case') {
      const caseId = interaction.options.getString('id').toUpperCase();
      const warn   = await Warn.findOne({ caseId, guildId: guild.id });
      if (!warn) return errorReply(interaction, `Case \`${caseId}\` not found.`);
      await interaction.reply({
        embeds: [info(`**Case ${caseId}**\nUser: <@${warn.userId}>\nModerator: <@${warn.moderatorId}>\nReason: ${warn.reason}\nDate: <t:${Math.floor(warn.createdAt.getTime() / 1000)}:F>\nActive: ${warn.active}`)],
        ephemeral: true,
      });
    }

    // ── history ───────────────────────────────────────────────────────────────
    else if (sub === 'history') {
      const target = interaction.options.getUser('user');
      const warns  = await Warn.find({ userId: target.id, guildId: guild.id }).sort({ createdAt: -1 });
      if (warns.length === 0) return interaction.reply({ embeds: [info(`**${target.tag}** has no warnings.`)], ephemeral: true });
      const pages  = [];
      const perPage = 5;
      for (let i = 0; i < warns.length; i += perPage) {
        const slice = warns.slice(i, i + perPage);
        const embed = info(
          slice.map(w => `\`${w.caseId}\` — ${w.reason} — <@${w.moderatorId}> — <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`).join('\n'),
          `Warn History — ${target.tag} (${warns.length} total)`,
        );
        pages.push(embed);
      }
      await paginate(interaction, pages, { ephemeral: true });
    }

    // ── clearwarns ───────────────────────────────────────────────────────────
    else if (sub === 'clearwarns') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const target = interaction.options.getUser('user');
      const result = await Warn.updateMany({ userId: target.id, guildId: guild.id }, { active: false });
      await interaction.reply({ embeds: [success(`Cleared **${result.modifiedCount}** warning(s) for **${target.tag}**.`)], ephemeral: true });
    }
  },
};
