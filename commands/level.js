'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const { xpForLevel, getLeaderboard } = require('../services/levelService');
const { number, ordinal } = require('../utils/formatters');
const { paginate } = require('../utils/paginator');
const User  = require('../models/User');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Leveling system')
    .addSubcommand(s => s
      .setName('rank')
      .setDescription('View your or another user\'s rank card')
      .addUserOption(o => o.setName('user').setDescription('User to check')))
    .addSubcommand(s => s.setName('leaderboard').setDescription('View the XP leaderboard'))
    .addSubcommand(s => s
      .setName('setxp')
      .setDescription('Set a user\'s XP')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(0)))
    .addSubcommand(s => s
      .setName('resetxp')
      .setDescription('Reset a user\'s XP and level')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(s => s
      .setName('setlevelrole')
      .setDescription('Assign a role reward for reaching a level')
      .addIntegerOption(o => o.setName('level').setDescription('Level required').setRequired(true).setMinValue(1))
      .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true)))
    .addSubcommand(s => s
      .setName('toggle')
      .setDescription('Enable or disable leveling')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable leveling?').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'rank') {
      const target  = interaction.options.getUser('user') || interaction.user;
      const userDoc = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
      if (!userDoc) return interaction.reply({ embeds: [info(`**${target.username}** has no XP yet.`)], ephemeral: true });

      const needed  = xpForLevel(userDoc.level);
      const all     = await User.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).lean();
      const rank    = all.findIndex(u => u.userId === target.id) + 1;

      await interaction.reply({ embeds: [info([
        `**Level:** ${userDoc.level}`,
        `**XP:** ${number(userDoc.xp)} / ${number(needed)}`,
        `**Server Rank:** ${ordinal(rank)} of ${all.length}`,
        `**Total Messages:** ${number(userDoc.totalMessages)}`,
      ].join('\n'), `${target.username}'s Rank`).setThumbnail(target.displayAvatarURL())] });
    }

    else if (sub === 'leaderboard') {
      const top   = await getLeaderboard(interaction.guild.id, 50);
      if (top.length === 0) return interaction.reply({ embeds: [info('No leveling data yet.')], ephemeral: true });
      const lines = top.map((u, i) => `${ordinal(i + 1)}. <@${u.userId}> — Level ${u.level} (${number(u.xp)} XP)`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 10) pages.push(neutral(lines.slice(i, i + 10).join('\n'), 'XP Leaderboard'));
      await paginate(interaction, pages);
    }

    else if (sub === 'setxp') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      await User.findOneAndUpdate({ userId: target.id, guildId: interaction.guild.id }, { xp: amount }, { upsert: true });
      await interaction.reply({ embeds: [success(`Set **${target.username}**'s XP to **${number(amount)}**.`)], ephemeral: true });
    }

    else if (sub === 'resetxp') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const target = interaction.options.getUser('user');
      await User.findOneAndUpdate({ userId: target.id, guildId: interaction.guild.id }, { xp: 0, level: 0 }, { upsert: true });
      await interaction.reply({ embeds: [success(`Reset **${target.username}**'s XP and level.`)], ephemeral: true });
    }

    else if (sub === 'setlevelrole') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const level    = interaction.options.getInteger('level');
      const role     = interaction.options.getRole('role');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      if (!(guildDoc.leveling.levelRoles instanceof Map)) guildDoc.leveling.levelRoles = new Map();
      guildDoc.leveling.levelRoles.set(String(level), role.id);
      guildDoc.markModified('leveling.levelRoles');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`<@&${role.id}> will be assigned at level **${level}**.`)], ephemeral: true });
    }

    else if (sub === 'toggle') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const enabled  = interaction.options.getBoolean('enabled');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.leveling.enabled = enabled;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Leveling ${enabled ? 'enabled' : 'disabled'}.`)], ephemeral: true });
    }
  },
};
