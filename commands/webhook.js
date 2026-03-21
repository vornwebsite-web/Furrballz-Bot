'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission }      = require('../utils/errors');
const { isManager }  = require('../utils/permissions');
const { paginate }   = require('../utils/paginator');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Webhook management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)

    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a webhook in a channel')
      .addStringOption(o => o.setName('name').setDescription('Webhook name').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel (defaults to current)'))
      .addStringOption(o => o.setName('avatar').setDescription('Avatar URL for the webhook')))

    .addSubcommand(s => s
      .setName('delete')
      .setDescription('Delete a webhook by ID')
      .addStringOption(o => o.setName('id').setDescription('Webhook ID').setRequired(true)))

    .addSubcommand(s => s
      .setName('list')
      .setDescription('List all webhooks in this server'))

    .addSubcommand(s => s
      .setName('send')
      .setDescription('Send a message through a webhook')
      .addStringOption(o => o.setName('id').setDescription('Webhook ID').setRequired(true))
      .addStringOption(o => o.setName('token').setDescription('Webhook token').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Message to send').setRequired(true))
      .addStringOption(o => o.setName('username').setDescription('Override display name'))
      .addStringOption(o => o.setName('avatar').setDescription('Override avatar URL'))),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name    = interaction.options.getString('name');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const avatar  = interaction.options.getString('avatar');

      if (!channel.isTextBased()) return errorReply(interaction, 'Webhooks can only be created in text channels.');
      await interaction.deferReply({ ephemeral: true });

      const webhook = await channel.createWebhook({
        name,
        avatar:  avatar || null,
        reason:  `Created by ${interaction.user.tag}`,
      });

      await interaction.editReply({
        embeds: [success([
          `Webhook **${name}** created in <#${channel.id}>!`,
          `**ID:** \`${webhook.id}\``,
          `**URL:** ||\`${webhook.url}\`||`,
          '',
          '⚠️ Keep the webhook URL private.',
        ].join('\n'))],
      });
    }

    else if (sub === 'delete') {
      const id = interaction.options.getString('id');
      await interaction.deferReply({ ephemeral: true });
      try {
        const webhooks = await interaction.guild.fetchWebhooks();
        const webhook  = webhooks.get(id);
        if (!webhook) return interaction.editReply({ embeds: [error('Webhook not found.')] });
        await webhook.delete(`Deleted by ${interaction.user.tag}`);
        await interaction.editReply({ embeds: [success(`Webhook \`${id}\` deleted.`)] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    else if (sub === 'list') {
      await interaction.deferReply({ ephemeral: true });
      const webhooks = await interaction.guild.fetchWebhooks();
      if (!webhooks.size) return interaction.editReply({ embeds: [info('No webhooks in this server.')] });
      const lines = [...webhooks.values()].map(w => `\`${w.id}\` **${w.name}** — <#${w.channelId}> — by ${w.owner?.tag || 'Unknown'}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), `Webhooks (${webhooks.size})`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'send') {
      const id       = interaction.options.getString('id');
      const token    = interaction.options.getString('token');
      const message  = interaction.options.getString('message');
      const username = interaction.options.getString('username');
      const avatar   = interaction.options.getString('avatar');

      await interaction.deferReply({ ephemeral: true });
      try {
        const { WebhookClient } = require('discord.js');
        const wc = new WebhookClient({ id, token });
        await wc.send({
          content:   message,
          username:  username || undefined,
          avatarURL: avatar   || undefined,
        });
        wc.destroy();
        await interaction.editReply({ embeds: [success('Message sent through webhook.')] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }
  },
};
