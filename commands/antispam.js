'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isManager }     = require('../utils/permissions');
const Guild             = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Anti-spam configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('enable').setDescription('Enable anti-spam'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable anti-spam'))
    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Set message threshold (messages per interval)')
      .addIntegerOption(o => o.setName('messages').setDescription('Max messages').setRequired(true).setMinValue(2).setMaxValue(50))
      .addIntegerOption(o => o.setName('seconds').setDescription('Within how many seconds').setRequired(true).setMinValue(1).setMaxValue(30)))
    .addSubcommand(s => s
      .setName('action')
      .setDescription('Set action taken on spam')
      .addStringOption(o => o.setName('type').setDescription('Action').setRequired(true)
        .addChoices(
          { name: 'Warn',    value: 'warn'  },
          { name: 'Mute',    value: 'mute'  },
          { name: 'Kick',    value: 'kick'  },
          { name: 'Ban',     value: 'ban'   },
        )))
    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('Whitelist a channel or role')
      .addStringOption(o => o.setName('type').setDescription('channel or role').setRequired(true)
        .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
      .addMentionableOption(o => o.setName('target').setDescription('Target').setRequired(true)))
    .addSubcommand(s => s.setName('status').setDescription('View anti-spam config')),

  async execute(interaction) {
    if (!isManager(interaction.member)) return noPermission(interaction);
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const cfg      = guildDoc.antispam;

    if (sub === 'enable')  { cfg.enabled = true;  await guildDoc.save(); return interaction.reply({ embeds: [success('Anti-spam enabled.')],  ephemeral: true }); }
    if (sub === 'disable') { cfg.enabled = false; await guildDoc.save(); return interaction.reply({ embeds: [success('Anti-spam disabled.')], ephemeral: true }); }

    if (sub === 'threshold') {
      cfg.threshold = interaction.options.getInteger('messages');
      cfg.interval  = interaction.options.getInteger('seconds') * 1000;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Spam threshold: **${cfg.threshold}** messages in **${cfg.interval / 1000}s**.`)], ephemeral: true });
    }
    else if (sub === 'action') {
      cfg.action = interaction.options.getString('type');
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Spam action set to **${cfg.action}**.`)], ephemeral: true });
    }
    else if (sub === 'whitelist') {
      const type   = interaction.options.getString('type');
      const target = interaction.options.getMentionable('target');
      if (type === 'channel' && !cfg.whitelist.channels.includes(target.id)) cfg.whitelist.channels.push(target.id);
      if (type === 'role'    && !cfg.whitelist.roles.includes(target.id))    cfg.whitelist.roles.push(target.id);
      await guildDoc.save();
      await interaction.reply({ embeds: [success('Whitelisted successfully.')], ephemeral: true });
    }
    else if (sub === 'status') {
      await interaction.reply({ embeds: [info([
        `**Enabled:** ${cfg.enabled ? '🟢 Yes' : '🔴 No'}`,
        `**Threshold:** ${cfg.threshold} messages / ${cfg.interval / 1000}s`,
        `**Action:** ${cfg.action}`,
        `**Whitelisted channels:** ${cfg.whitelist.channels.length}`,
        `**Whitelisted roles:** ${cfg.whitelist.roles.length}`,
      ].join('\n'), 'Anti-Spam Status')], ephemeral: true });
    }
  },
};
