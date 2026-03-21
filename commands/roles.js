'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager, isHigherRole }  = require('../utils/permissions');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Role management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add a role to a member')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a role from a member')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s
      .setName('info')
      .setDescription('View info about a role')
      .addRoleOption(o => o.setName('role').setDescription('Role to inspect').setRequired(true)))
    .addSubcommand(s => s
      .setName('give')
      .setDescription('Give a role to all members matching a condition')
      .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)))
    .addSubcommand(s => s
      .setName('take')
      .setDescription('Remove a role from all members who have it')
      .addRoleOption(o => o.setName('role').setDescription('Role to remove from all').setRequired(true)))
    .addSubcommand(s => s
      .setName('autorole')
      .setDescription('Set a role to auto-assign to new members')
      .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign').setRequired(true))
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(s => s
      .setName('reactionrole')
      .setDescription('Set up a reaction role (message ID + emoji + role)')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Reaction emoji').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add' || sub === 'remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return noPermission(interaction);
      const member = interaction.options.getMember('user');
      const role   = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!member) return errorReply(interaction, 'Member not found.');
      if (role.managed) return errorReply(interaction, 'Cannot manage bot/integration roles.');
      if (!isHigherRole(interaction.member, member) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return errorReply(interaction, 'Your role is not high enough.');
      await interaction.deferReply({ ephemeral: true });
      if (sub === 'add')    await member.roles.add(role, reason);
      else                  await member.roles.remove(role, reason);
      await interaction.editReply({ embeds: [success(`${sub === 'add' ? 'Added' : 'Removed'} <@&${role.id}> ${sub === 'add' ? 'to' : 'from'} <@${member.id}>.`)] });
    }

    else if (sub === 'info') {
      const role = interaction.options.getRole('role');
      await interaction.reply({ embeds: [info([
        `**Name:** ${role.name}`,
        `**ID:** \`${role.id}\``,
        `**Color:** ${role.hexColor}`,
        `**Hoisted:** ${role.hoist}`,
        `**Mentionable:** ${role.mentionable}`,
        `**Members:** ${role.members.size}`,
        `**Position:** ${role.position}`,
        `**Managed:** ${role.managed}`,
        `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
      ].join('\n'), `Role Info — ${role.name}`)] });
    }

    else if (sub === 'give' || sub === 'take') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const role = interaction.options.getRole('role');
      if (role.managed) return errorReply(interaction, 'Cannot manage integration roles.');
      await interaction.deferReply({ ephemeral: true });
      const members = await interaction.guild.members.fetch();
      let count = 0;
      for (const [, m] of members) {
        try {
          if (sub === 'give' && !m.roles.cache.has(role.id))  { await m.roles.add(role); count++; }
          if (sub === 'take' && m.roles.cache.has(role.id))   { await m.roles.remove(role); count++; }
        } catch { /* skip unmanageable members */ }
      }
      await interaction.editReply({ embeds: [success(`${sub === 'give' ? 'Gave' : 'Removed'} <@&${role.id}> ${sub === 'give' ? 'to' : 'from'} **${count}** member(s).`)] });
    }

    else if (sub === 'autorole') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const role    = interaction.options.getRole('role');
      const enabled = interaction.options.getBoolean('enabled');
      const gDoc    = await Guild.getOrCreate(interaction.guild.id);
      if (enabled && !gDoc.autoRoles.includes(role.id)) gDoc.autoRoles.push(role.id);
      if (!enabled) gDoc.autoRoles = gDoc.autoRoles.filter(id => id !== role.id);
      await gDoc.save();
      await interaction.reply({ embeds: [success(`Auto-role <@&${role.id}> ${enabled ? 'enabled' : 'disabled'}.`)], ephemeral: true });
    }

    else if (sub === 'reactionrole') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      await interaction.reply({ embeds: [info('Reaction roles are configured via the dashboard for full control.\nGo to **Dashboard → Roles** to set up reaction roles.')], ephemeral: true });
    }
  },
};
