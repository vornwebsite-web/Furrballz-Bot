'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,

  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod filters')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s.setName('enable').setDescription('Enable automod'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable automod'))

    .addSubcommand(s => s
      .setName('filter')
      .setDescription('Toggle a specific filter')
      .addStringOption(o => o.setName('type').setDescription('Filter type').setRequired(true)
        .addChoices(
          { name: 'Invites', value: 'filterInvites' },
          { name: 'Links',   value: 'filterLinks'   },
          { name: 'Caps',    value: 'filterCaps'    },
          { name: 'Mentions',value: 'filterMentions'},
        ))
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))

    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Set caps % or mention limit threshold')
      .addStringOption(o => o.setName('type').setDescription('Threshold type').setRequired(true)
        .addChoices({ name: 'Caps %', value: 'caps' }, { name: 'Mention Limit', value: 'mentions' }))
      .addIntegerOption(o => o.setName('value').setDescription('Threshold value').setRequired(true).setMinValue(1).setMaxValue(100)))

    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('Add a channel or role to the automod whitelist')
      .addStringOption(o => o.setName('type').setDescription('channel or role').setRequired(true)
        .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
      .addMentionableOption(o => o.setName('target').setDescription('Channel or role to whitelist').setRequired(true)))

    .addSubcommand(s => s
      .setName('blacklist')
      .setDescription('Add or remove a banned word')
      .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addStringOption(o => o.setName('word').setDescription('Word to add/remove').setRequired(true)))

    .addSubcommand(s => s
      .setName('log')
      .setDescription('Set channel for automod logs')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))

    .addSubcommand(s => s
      .setName('test')
      .setDescription('Test automod against a string')
      .addStringOption(o => o.setName('content').setDescription('Content to test').setRequired(true)))

    .addSubcommand(s => s.setName('status').setDescription('View current automod configuration')),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);

    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.automod;

    if (sub === 'enable')  { cfg.enabled = true;  await guildDoc.save(); return interaction.reply({ embeds: [success('Automod enabled.')], ephemeral: true }); }
    if (sub === 'disable') { cfg.enabled = false; await guildDoc.save(); return interaction.reply({ embeds: [success('Automod disabled.')], ephemeral: true }); }

    if (sub === 'filter') {
      const type    = interaction.options.getString('type');
      const enabled = interaction.options.getBoolean('enabled');
      cfg[type]     = enabled;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Filter **${type}** ${enabled ? 'enabled' : 'disabled'}.`)], ephemeral: true });
    }

    else if (sub === 'threshold') {
      const type  = interaction.options.getString('type');
      const value = interaction.options.getInteger('value');
      if (type === 'caps')     cfg.capsThreshold  = value;
      if (type === 'mentions') cfg.mentionLimit    = value;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Threshold for **${type}** set to **${value}**.`)], ephemeral: true });
    }

    else if (sub === 'whitelist') {
      const type   = interaction.options.getString('type');
      const target = interaction.options.getMentionable('target');
      if (type === 'channel' && !cfg.whitelist.channels.includes(target.id)) cfg.whitelist.channels.push(target.id);
      if (type === 'role'    && !cfg.whitelist.roles.includes(target.id))    cfg.whitelist.roles.push(target.id);
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Added to automod whitelist.`)], ephemeral: true });
    }

    else if (sub === 'blacklist') {
      const action = interaction.options.getString('action');
      const word   = interaction.options.getString('word').toLowerCase();
      if (action === 'add' && !cfg.bannedWords.includes(word)) {
        cfg.bannedWords.push(word);
      } else if (action === 'remove') {
        cfg.bannedWords = cfg.bannedWords.filter(w => w !== word);
      }
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Word \`${word}\` ${action === 'add' ? 'added to' : 'removed from'} banned words.`)], ephemeral: true });
    }

    else if (sub === 'log') {
      const channel = interaction.options.getChannel('channel');
      cfg.logChannelId = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Automod logs will be sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'test') {
      const content = interaction.options.getString('content');
      const { check } = require('../services/automodService');
      // Build a fake message-like object for testing
      const fakeMessage = {
        content,
        author:  { id: interaction.user.id, tag: interaction.user.tag, bot: false },
        member:  interaction.member,
        guild:   interaction.guild,
        channel: interaction.channel,
        client,
        delete:  async () => {},
      };
      guildDoc.automod.enabled = true;
      const triggered = await check(fakeMessage, guildDoc);
      await interaction.reply({ embeds: [info(`Test result: **${triggered ? '🔴 Would be flagged' : '🟢 Would pass'}**`, 'Automod Test')], ephemeral: true });
    }

    else if (sub === 'status') {
      await interaction.reply({
        embeds: [info([
          `**Enabled:** ${cfg.enabled ? '🟢 Yes' : '🔴 No'}`,
          `**Filter Invites:** ${cfg.filterInvites}`,
          `**Filter Links:** ${cfg.filterLinks}`,
          `**Filter Caps:** ${cfg.filterCaps} (threshold: ${cfg.capsThreshold}%)`,
          `**Filter Mentions:** ${cfg.filterMentions} (limit: ${cfg.mentionLimit})`,
          `**Action:** ${cfg.action}`,
          `**Banned Words:** ${cfg.bannedWords.length}`,
          `**Log Channel:** ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Not set'}`,
          `**Whitelisted Channels:** ${cfg.whitelist.channels.length}`,
          `**Whitelisted Roles:** ${cfg.whitelist.roles.length}`,
        ].join('\n'), 'Automod Status')],
        ephemeral: true,
      });
    }
  },
};
