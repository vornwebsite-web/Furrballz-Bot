'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }   = require('../utils/permissions');
const { paginate }    = require('../utils/paginator');
const Partnership     = require('../models/Partnership');
const Guild           = require('../models/Guild');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('partner')
    .setDescription('Partnership management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Add a partner server')
      .addStringOption(o => o.setName('guild_id').setDescription('Partner guild ID').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Partner server name').setRequired(true))
      .addUserOption(o => o.setName('contact').setDescription('Contact person').setRequired(true))
      .addStringOption(o => o.setName('invite').setDescription('Partner invite URL'))
      .addStringOption(o => o.setName('description').setDescription('Partnership description')))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remove a partner server')
      .addStringOption(o => o.setName('guild_id').setDescription('Partner guild ID').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all partner servers'))
    .addSubcommand(s => s
      .setName('bump')
      .setDescription('Send partner ad to the partner channel')
      .addStringOption(o => o.setName('guild_id').setDescription('Partner guild ID to bump').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Custom bump message').setRequired(true)))
    .addSubcommand(s => s
      .setName('channel')
      .setDescription('Set the partner channel')
      .addChannelOption(o => o.setName('channel').setDescription('Partner channel').setRequired(true))),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const guildId     = interaction.options.getString('guild_id');
      const name        = interaction.options.getString('name');
      const contact     = interaction.options.getUser('contact');
      const invite      = interaction.options.getString('invite');
      const description = interaction.options.getString('description');

      const existing = await Partnership.findOne({ guildId: interaction.guild.id, partnerGuildId: guildId });
      if (existing) return errorReply(interaction, 'This server is already a partner.');

      await Partnership.create({
        guildId:        interaction.guild.id,
        partnerGuildId: guildId,
        partnerName:    name,
        contactId:      contact.id,
        inviteUrl:      invite || null,
        description:    description || null,
      });
      await interaction.reply({ embeds: [success(`**${name}** added as a partner server!\nContact: <@${contact.id}>`)], ephemeral: true });
    }

    else if (sub === 'remove') {
      const guildId = interaction.options.getString('guild_id');
      const doc     = await Partnership.findOneAndDelete({ guildId: interaction.guild.id, partnerGuildId: guildId });
      if (!doc) return errorReply(interaction, 'Partner not found.');
      await interaction.reply({ embeds: [success(`**${doc.partnerName}** removed from partners.`)], ephemeral: true });
    }

    else if (sub === 'list') {
      const partners = await Partnership.find({ guildId: interaction.guild.id, active: true });
      if (!partners.length) return interaction.reply({ embeds: [info('No partner servers.')], ephemeral: true });
      const lines = partners.map(p => `**${p.partnerName}** (\`${p.partnerGuildId}\`) — Contact: <@${p.contactId}>${p.inviteUrl ? ` — [Invite](${p.inviteUrl})` : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), `Partners (${partners.length})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'bump') {
      const guildId  = interaction.options.getString('guild_id');
      const message  = interaction.options.getString('message');
      const partner  = await Partnership.findOne({ guildId: interaction.guild.id, partnerGuildId: guildId });
      if (!partner) return errorReply(interaction, 'Partner not found.');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      if (!guildDoc.partnerChannelId) return errorReply(interaction, 'No partner channel set. Use `/partner channel` first.');
      const channel  = await interaction.client.channels.fetch(guildDoc.partnerChannelId).catch(() => null);
      if (!channel) return errorReply(interaction, 'Partner channel not found.');
      await channel.send({
        embeds: [info(message, `Partner — ${partner.partnerName}`).setFooter({ text: `Bumped by ${interaction.user.tag}` })],
      });
      partner.lastBumpAt = new Date();
      await partner.save();
      await interaction.reply({ embeds: [success(`Bumped **${partner.partnerName}** in <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'channel') {
      const channel  = interaction.options.getChannel('channel');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.partnerChannelId = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Partner channel set to <#${channel.id}>.`)], ephemeral: true });
    }
  },
};
