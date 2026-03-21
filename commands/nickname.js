'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator } = require('../utils/permissions');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Nickname management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)

    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set a member\'s nickname')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setMaxLength(32)))

    .addSubcommand(s => s
      .setName('reset')
      .setDescription('Reset a member\'s nickname to their username')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)))

    .addSubcommand(s => s
      .setName('me')
      .setDescription('Set your own nickname')
      .addStringOption(o => o.setName('nickname').setDescription('Your new nickname').setMaxLength(32)))

    .addSubcommand(s => s
      .setName('massreset')
      .setDescription('Reset all nicknames in the server (Admin only)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'me') {
      const nickname = interaction.options.getString('nickname') || null;
      try {
        await interaction.member.setNickname(nickname, 'Self-nickname change');
        await interaction.reply({ embeds: [success(nickname ? `Your nickname has been set to **${nickname}**.` : 'Your nickname has been reset.')], ephemeral: true });
      } catch {
        await errorReply(interaction, 'I cannot change your nickname. You may be higher than me in role hierarchy.');
      }
      return;
    }

    if (!isModerator(interaction.member)) return noPermission(interaction);

    if (sub === 'set') {
      const target   = interaction.options.getMember('user');
      const nickname = interaction.options.getString('nickname') || null;
      if (!target) return errorReply(interaction, 'Member not found.');
      if (!target.manageable) return errorReply(interaction, 'I cannot change this member\'s nickname.');
      await target.setNickname(nickname, `Set by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(nickname ? `Set **${target.user.tag}**'s nickname to **${nickname}**.` : `Reset **${target.user.tag}**'s nickname.`)], ephemeral: true });
    }

    else if (sub === 'reset') {
      const target = interaction.options.getMember('user');
      if (!target) return errorReply(interaction, 'Member not found.');
      if (!target.manageable) return errorReply(interaction, 'I cannot change this member\'s nickname.');
      await target.setNickname(null, `Reset by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [success(`Reset **${target.user.tag}**'s nickname.`)], ephemeral: true });
    }

    else if (sub === 'massreset') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return noPermission(interaction);
      await interaction.deferReply({ ephemeral: true });
      const members = await interaction.guild.members.fetch();
      let count = 0;
      for (const [, m] of members) {
        if (m.nickname && m.manageable) {
          await m.setNickname(null, 'Mass nickname reset').catch(() => {});
          count++;
        }
      }
      await interaction.editReply({ embeds: [success(`Reset **${count}** nickname(s).`)] });
    }
  },
};
