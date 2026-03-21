'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isModerator, isManager }   = require('../utils/permissions');
const { paginate } = require('../utils/paginator');
const Suggestion = require('../models/Suggestion');
const Guild      = require('../models/Guild');

module.exports = {
  cooldown: 10000,

  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggestion system')

    .addSubcommand(s => s
      .setName('create')
      .setDescription('Submit a suggestion (posts to the suggestion channel with vote reactions)')
      .addStringOption(o => o
        .setName('suggestion')
        .setDescription('Your suggestion')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000)))

    .addSubcommand(s => s
      .setName('approve')
      .setDescription('Approve a suggestion')
      .addStringOption(o => o.setName('id').setDescription('Suggestion ID').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Optional review note')))

    .addSubcommand(s => s
      .setName('deny')
      .setDescription('Deny a suggestion')
      .addStringOption(o => o.setName('id').setDescription('Suggestion ID').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Reason for denial')))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('List suggestions')
      .addStringOption(o => o.setName('status').setDescription('Filter by status')
        .addChoices(
          { name: 'Pending',  value: 'pending'  },
          { name: 'Approved', value: 'approved' },
          { name: 'Denied',   value: 'denied'   },
        )))

    .addSubcommand(s => s
      .setName('setchannel')
      .setDescription('Set the suggestions channel — messages posted there auto-get ✅ ❌ reactions')
      .addChannelOption(o => o.setName('channel').setDescription('Suggestion channel').setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── create — post to suggestion channel, bot reacts ───────────────────────
    if (sub === 'create') {
      const content  = interaction.options.getString('suggestion');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);

      if (!guildDoc.suggestionChannelId) {
        return errorReply(
          interaction,
          'No suggestion channel is set up yet. An admin can configure one with `/suggest setchannel`.',
        );
      }

      const channel = await client.channels.fetch(guildDoc.suggestionChannelId).catch(() => null);
      if (!channel?.isTextBased()) {
        return errorReply(interaction, 'The suggestion channel is no longer accessible.');
      }

      await interaction.deferReply({ ephemeral: true });

      // Build suggestion embed
      const embed = info(content, '💡 New Suggestion')
        .setAuthor({
          name:    interaction.user.tag,
          iconURL: interaction.user.displayAvatarURL({ size: 64 }),
        })
        .setFooter({ text: `Vote using the reactions below` });

      const msg = await channel.send({ embeds: [embed] });

      // React in order — ✅ first so it appears on the left
      await msg.react('✅').catch(() => {});
      await msg.react('❌').catch(() => {});

      // Save to DB
      const doc = await Suggestion.create({
        guildId:   interaction.guild.id,
        authorId:  interaction.user.id,
        content,
        channelId: channel.id,
        messageId: msg.id,
      });

      await interaction.editReply({
        embeds: [success(`Your suggestion has been posted in <#${channel.id}>!\nID: \`${doc._id}\``)],
      });
    }

    // ── approve / deny ────────────────────────────────────────────────────────
    else if (sub === 'approve' || sub === 'deny') {
      if (!isModerator(interaction.member)) return noPermission(interaction);

      const id   = interaction.options.getString('id');
      const note = interaction.options.getString('note') || null;
      const newStatus = sub === 'approve' ? 'approved' : 'denied';

      const doc = await Suggestion.findOneAndUpdate(
        { _id: id, guildId: interaction.guild.id },
        { status: newStatus, reviewerId: interaction.user.id, reviewNote: note },
        { new: true },
      );
      if (!doc) return errorReply(interaction, 'Suggestion not found.');

      // Update the embed in the channel to reflect new status
      if (doc.channelId && doc.messageId) {
        try {
          const ch  = await client.channels.fetch(doc.channelId).catch(() => null);
          const msg = await ch?.messages.fetch(doc.messageId).catch(() => null);
          if (msg) {
            const updatedEmbed = (sub === 'approve' ? success : error)(
              doc.content,
              `💡 Suggestion — ${sub === 'approve' ? '✅ Approved' : '❌ Denied'}`,
            )
              .setAuthor({ name: `By ${doc.authorId}` })
              .setFooter({
                text: `${sub === 'approve' ? 'Approved' : 'Denied'} by ${interaction.user.tag}${note ? ` · ${note}` : ''}`,
              });
            await msg.edit({ embeds: [updatedEmbed] }).catch(() => {});
          }
        } catch { /* ignore */ }
      }

      await interaction.reply({
        embeds: [success(`Suggestion **${id}** has been **${newStatus}**.`)],
        ephemeral: true,
      });
    }

    // ── list ──────────────────────────────────────────────────────────────────
    else if (sub === 'list') {
      const status = interaction.options.getString('status') || 'pending';
      const docs   = await Suggestion.find({ guildId: interaction.guild.id, status })
        .sort({ createdAt: -1 })
        .limit(50);

      if (!docs.length) {
        return interaction.reply({ embeds: [info(`No ${status} suggestions.`)], ephemeral: true });
      }

      const lines = docs.map(d =>
        `\`${d._id}\` 👍 ${d.upvotes} 👎 ${d.downvotes} by <@${d.authorId}>\n${d.content.slice(0, 80)}`,
      );
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) {
        pages.push(neutral(
          lines.slice(i, i + 5).join('\n\n'),
          `${status.charAt(0).toUpperCase() + status.slice(1)} Suggestions (${docs.length})`,
        ));
      }
      await paginate(interaction, pages, { ephemeral: true });
    }

    // ── setchannel ────────────────────────────────────────────────────────────
    else if (sub === 'setchannel') {
      if (!isManager(interaction.member)) return noPermission(interaction);

      const channel  = interaction.options.getChannel('channel');
      const guildDoc = await Guild.getOrCreate(interaction.guild.id);
      guildDoc.suggestionChannelId = channel.id;
      await guildDoc.save();

      await interaction.reply({
        embeds: [success(
          `Suggestion channel set to <#${channel.id}>.\n\nAnyone can now post a suggestion with \`/suggest create\`, or by writing directly in <#${channel.id}> — the bot will automatically react with ✅ and ❌ so members can vote.`,
        )],
        ephemeral: true,
      });
    }
  },
};
