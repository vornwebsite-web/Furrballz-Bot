'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const { paginate }  = require('../utils/paginator');
const User  = require('../models/User');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Birthday system')
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set your birthday')
      .addIntegerOption(o => o.setName('month').setDescription('Month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
      .addIntegerOption(o => o.setName('day').setDescription('Day (1-31)').setRequired(true).setMinValue(1).setMaxValue(31)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove your birthday'))
    .addSubcommand(s => s.setName('list').setDescription('List server members with birthdays set'))
    .addSubcommand(s => s
      .setName('channel')
      .setDescription('Set the birthday announcement channel')
      .addChannelOption(o => o.setName('channel').setDescription('Announcement channel').setRequired(true)))
    .addSubcommand(s => s
      .setName('role')
      .setDescription('Set the birthday role')
      .addRoleOption(o => o.setName('role').setDescription('Role to assign on birthday').setRequired(true)))
    .addSubcommand(s => s.setName('upcoming').setDescription('View upcoming birthdays (next 30 days)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const month  = String(interaction.options.getInteger('month')).padStart(2, '0');
      const day    = String(interaction.options.getInteger('day')).padStart(2, '0');
      const user   = await User.getOrCreate(interaction.user.id, interaction.guild.id);
      user.birthday = `${month}-${day}`;
      await user.save();
      await interaction.reply({ embeds: [success(`Your birthday has been set to **${month}/${day}**! 🎂`)], ephemeral: true });
    }

    else if (sub === 'remove') {
      await User.updateOne({ userId: interaction.user.id, guildId: interaction.guild.id }, { birthday: null });
      await interaction.reply({ embeds: [success('Your birthday has been removed.')], ephemeral: true });
    }

    else if (sub === 'list') {
      const users = await User.find({ guildId: interaction.guild.id, birthday: { $ne: null } }).sort({ birthday: 1 });
      if (!users.length) return interaction.reply({ embeds: [info('No birthdays set in this server.')], ephemeral: true });
      const lines = users.map(u => `<@${u.userId}> — ${u.birthday}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 10) pages.push(neutral(lines.slice(i, i + 10).join('\n'), `Server Birthdays (${users.length})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'channel') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const channel  = interaction.options.getChannel('channel');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.birthdayChannelId = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Birthday announcements will be sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'role') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const role     = interaction.options.getRole('role');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.birthdayRoleId = role.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Birthday role set to <@&${role.id}>.`)], ephemeral: true });
    }

    else if (sub === 'upcoming') {
      const now   = new Date();
      const users = await User.find({ guildId: interaction.guild.id, birthday: { $ne: null } });
      const upcoming = users
        .map(u => {
          const [m, d]  = u.birthday.split('-').map(Number);
          const thisYear = new Date(now.getFullYear(), m - 1, d);
          if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
          return { userId: u.userId, date: thisYear, birthday: u.birthday };
        })
        .filter(u => (u.date.getTime() - now.getTime()) <= 30 * 24 * 60 * 60 * 1000)
        .sort((a, b) => a.date - b.date);

      if (!upcoming.length) return interaction.reply({ embeds: [info('No birthdays in the next 30 days.')], ephemeral: true });
      const lines = upcoming.map(u => `<@${u.userId}> — ${u.birthday} (<t:${Math.floor(u.date.getTime() / 1000)}:R>)`);
      await interaction.reply({ embeds: [neutral(lines.join('\n'), 'Upcoming Birthdays')] });
    }
  },
};
