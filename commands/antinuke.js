'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager } = require('../utils/permissions');
const AntiNuke      = require('../models/AntiNuke');

module.exports = {
  cooldown: 2000,

  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Anti-nuke protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(s => s
      .setName('enable')
      .setDescription('Enable anti-nuke protection'))

    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable anti-nuke protection'))

    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('Add a user or bot to the whitelist')
      .addUserOption(o => o.setName('user').setDescription('User to whitelist').setRequired(true)))

    .addSubcommand(s => s
      .setName('unwhitelist')
      .setDescription('Remove a user from the whitelist')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))

    .addSubcommand(s => s
      .setName('punishment')
      .setDescription('Set the punishment for nuke attempts')
      .addStringOption(o => o.setName('type').setDescription('Punishment type').setRequired(true)
        .addChoices(
          { name: 'Ban',         value: 'ban'     },
          { name: 'Kick',        value: 'kick'    },
          { name: 'Strip Roles', value: 'strip'   },
          { name: 'De-Owner',    value: 'deowner' },
          { name: 'Timeout',     value: 'timeout' },
        )))

    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Set action threshold for a specific action type')
      .addStringOption(o => o.setName('action').setDescription('Action type').setRequired(true)
        .addChoices(
          { name: 'Channel Create', value: 'channelCreate' },
          { name: 'Channel Delete', value: 'channelDelete' },
          { name: 'Role Create',    value: 'roleCreate'    },
          { name: 'Role Delete',    value: 'roleDelete'    },
          { name: 'Ban',            value: 'ban'           },
          { name: 'Kick',           value: 'kick'          },
          { name: 'Webhook Create', value: 'webhookCreate' },
          { name: 'Role Strip',     value: 'roleStrip'     },
        ))
      .addIntegerOption(o => o.setName('count').setDescription('Max actions before trigger (1-25)').setRequired(true).setMinValue(1).setMaxValue(25)))

    .addSubcommand(s => s
      .setName('logs')
      .setDescription('Set the alert log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for alerts').setRequired(true)))

    .addSubcommand(s => s
      .setName('status')
      .setDescription('View current anti-nuke configuration')),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);

    const sub = interaction.options.getSubcommand();
    const cfg = await AntiNuke.getOrCreate(interaction.guild.id);

    if (sub === 'enable') {
      cfg.enabled = true;
      await cfg.save();
      await interaction.reply({ embeds: [success('☢️ Anti-nuke protection has been **enabled**.')], ephemeral: true });
    }

    else if (sub === 'disable') {
      cfg.enabled = false;
      await cfg.save();
      await interaction.reply({ embeds: [success('Anti-nuke protection has been **disabled**.')], ephemeral: true });
    }

    else if (sub === 'whitelist') {
      const user = interaction.options.getUser('user');
      if (!cfg.whitelist.includes(user.id)) {
        cfg.whitelist.push(user.id);
        await cfg.save();
      }
      await interaction.reply({ embeds: [success(`<@${user.id}> has been added to the anti-nuke whitelist.`)], ephemeral: true });
    }

    else if (sub === 'unwhitelist') {
      const user = interaction.options.getUser('user');
      cfg.whitelist = cfg.whitelist.filter(id => id !== user.id);
      await cfg.save();
      await interaction.reply({ embeds: [success(`<@${user.id}> has been removed from the whitelist.`)], ephemeral: true });
    }

    else if (sub === 'punishment') {
      const type   = interaction.options.getString('type');
      cfg.punishment = type;
      await cfg.save();
      await interaction.reply({ embeds: [success(`Anti-nuke punishment set to **${type}**.`)], ephemeral: true });
    }

    else if (sub === 'threshold') {
      const action = interaction.options.getString('action');
      const count  = interaction.options.getInteger('count');
      cfg.thresholds[action] = count;
      cfg.markModified('thresholds');
      await cfg.save();
      await interaction.reply({ embeds: [success(`Threshold for **${action}** set to **${count}** actions.`)], ephemeral: true });
    }

    else if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      cfg.logChannelId = channel.id;
      await cfg.save();
      await interaction.reply({ embeds: [success(`Anti-nuke alerts will be sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'status') {
      const th = cfg.thresholds;
      const embed = info(
        [
          `**Status:** ${cfg.enabled ? '🟢 Enabled' : '🔴 Disabled'}`,
          `**Punishment:** ${cfg.punishment}`,
          `**Log Channel:** ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Not set'}`,
          `**Window:** ${cfg.windowSeconds}s`,
          '',
          '**Thresholds:**',
          `Channel Create: ${th.channelCreate} | Channel Delete: ${th.channelDelete}`,
          `Role Create: ${th.roleCreate} | Role Delete: ${th.roleDelete}`,
          `Ban: ${th.ban} | Kick: ${th.kick} | Webhook: ${th.webhookCreate} | Role Strip: ${th.roleStrip}`,
          '',
          `**Whitelist (${cfg.whitelist.length}):** ${cfg.whitelist.map(id => `<@${id}>`).join(', ') || 'None'}`,
        ].join('\n'),
        'Anti-Nuke Status',
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
