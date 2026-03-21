'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator }   = require('../utils/permissions');
const { appealModal }   = require('../utils/modalBuilder');
const { paginate }      = require('../utils/paginator');
const Appeal = require('../models/Appeal');
const Warn   = require('../models/Warn');

module.exports = {
  cooldown: 10000,
  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Case appeal system')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Submit an appeal for a punishment')
      .addStringOption(o => o.setName('case_id').setDescription('Case ID to appeal').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List pending appeals')
      .addStringOption(o => o.setName('status').setDescription('Filter by status')
        .addChoices({ name: 'Pending', value: 'pending' }, { name: 'Approved', value: 'approved' }, { name: 'Denied', value: 'denied' })))
    .addSubcommand(s => s
      .setName('approve')
      .setDescription('Approve an appeal')
      .addStringOption(o => o.setName('id').setDescription('Appeal ID').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Review note')))
    .addSubcommand(s => s
      .setName('deny')
      .setDescription('Deny an appeal')
      .addStringOption(o => o.setName('id').setDescription('Appeal ID').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Reason for denial')))
    .addSubcommand(s => s
      .setName('close')
      .setDescription('Close an appeal without action')
      .addStringOption(o => o.setName('id').setDescription('Appeal ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const caseId = interaction.options.getString('case_id').toUpperCase();
      const warn   = await Warn.findOne({ caseId, guildId: interaction.guild.id });
      if (!warn) return errorReply(interaction, `Case \`${caseId}\` not found.`);
      if (warn.userId !== interaction.user.id) return errorReply(interaction, 'You can only appeal your own cases.');
      const existing = await Appeal.findOne({ caseId, userId: interaction.user.id, status: 'pending' });
      if (existing) return errorReply(interaction, 'You already have a pending appeal for this case.');
      return interaction.showModal(appealModal(caseId));
    }

    else if (sub === 'list') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const status  = interaction.options.getString('status') || 'pending';
      const appeals = await Appeal.find({ guildId: interaction.guild.id, status }).sort({ createdAt: -1 }).limit(50);
      if (!appeals.length) return interaction.reply({ embeds: [info(`No ${status} appeals.`)], ephemeral: true });
      const lines = appeals.map(a => `\`${a._id}\` — Case \`${a.caseId}\` by <@${a.userId}>\n*"${a.reason.slice(0, 80)}"*`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) pages.push(neutral(lines.slice(i, i + 5).join('\n\n'), `${status} Appeals`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'approve' || sub === 'deny' || sub === 'close') {
      if (!isModerator(interaction.member)) return noPermission(interaction);
      const id   = interaction.options.getString('id');
      const note = interaction.options.getString('note') || null;
      const status = sub === 'approve' ? 'approved' : sub === 'deny' ? 'denied' : 'denied';
      const appeal = await Appeal.findOneAndUpdate(
        { _id: id, guildId: interaction.guild.id },
        { status, reviewerId: interaction.user.id, reviewNote: note },
        { new: true },
      );
      if (!appeal) return errorReply(interaction, 'Appeal not found.');

      // Notify the user
      const user = await interaction.client.users.fetch(appeal.userId).catch(() => null);
      if (user) {
        const embed = sub === 'approve'
          ? success(`Your appeal for case \`${appeal.caseId}\` in **${interaction.guild.name}** has been **approved**.${note ? `\n**Note:** ${note}` : ''}`)
          : error(`Your appeal for case \`${appeal.caseId}\` in **${interaction.guild.name}** has been **${sub === 'close' ? 'closed' : 'denied'}**.${note ? `\n**Reason:** ${note}` : ''}`);
        await user.send({ embeds: [embed] }).catch(() => {});
      }

      await interaction.reply({ embeds: [success(`Appeal **${id}** has been **${sub === 'close' ? 'closed' : status}**.`)], ephemeral: true });
    }
  },
};
