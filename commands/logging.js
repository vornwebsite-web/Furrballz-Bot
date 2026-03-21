'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission } = require('../utils/errors');
const { isManager }    = require('../utils/permissions');
const Guild            = require('../models/Guild');
const logService       = require('../services/logService');

const LOG_EVENTS = [
  { name: 'Message Delete',    value: 'messageDelete'  },
  { name: 'Message Edit',      value: 'messageUpdate'  },
  { name: 'Member Join',       value: 'memberJoin'     },
  { name: 'Member Leave',      value: 'memberLeave'    },
  { name: 'Member Update',     value: 'memberUpdate'   },
  { name: 'Ban Add',           value: 'banAdd'         },
  { name: 'Ban Remove',        value: 'banRemove'      },
  { name: 'Channel Create',    value: 'channelCreate'  },
  { name: 'Channel Delete',    value: 'channelDelete'  },
  { name: 'Channel Update',    value: 'channelUpdate'  },
  { name: 'Role Create',       value: 'roleCreate'     },
  { name: 'Role Delete',       value: 'roleDelete'     },
  { name: 'Role Update',       value: 'roleUpdate'     },
  { name: 'Voice Update',      value: 'voiceUpdate'    },
  { name: 'Mod Actions',       value: 'modAction'      },
  { name: 'Guild Update',      value: 'guildUpdate'    },
  { name: 'Invite Create',     value: 'inviteCreate'   },
];

module.exports = {
  cooldown: 2000,

  data: new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Configure server logging')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s
      .setName('set')
      .setDescription('Set a log channel for an event type')
      .addStringOption(o => o.setName('event').setDescription('Event to log').setRequired(true)
        .addChoices(...LOG_EVENTS))
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))

    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable logging for an event')
      .addStringOption(o => o.setName('event').setDescription('Event to disable').setRequired(true)
        .addChoices(...LOG_EVENTS)))

    .addSubcommand(s => s
      .setName('view')
      .setDescription('View current log channel configuration'))

    .addSubcommand(s => s
      .setName('test')
      .setDescription('Send a test log message to an event\'s channel')
      .addStringOption(o => o.setName('event').setDescription('Event to test').setRequired(true)
        .addChoices(...LOG_EVENTS)))

    .addSubcommand(s => s
      .setName('ignore')
      .setDescription('Add or remove a channel from the log ignore list')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to toggle').setRequired(true))),

  async execute(interaction, client) {
    if (!isManager(interaction.member)) return noPermission(interaction);

    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);

    if (sub === 'set') {
      const event   = interaction.options.getString('event');
      const channel = interaction.options.getChannel('channel');
      guildDoc.logChannels[event] = channel.id;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`**${event}** logs will be sent to <#${channel.id}>.`)], ephemeral: true });
    }

    else if (sub === 'disable') {
      const event = interaction.options.getString('event');
      guildDoc.logChannels[event] = null;
      await guildDoc.save();
      await interaction.reply({ embeds: [success(`Logging for **${event}** has been disabled.`)], ephemeral: true });
    }

    else if (sub === 'view') {
      const lines = LOG_EVENTS.map(e => {
        const channelId = guildDoc.logChannels?.[e.value];
        return `**${e.name}:** ${channelId ? `<#${channelId}>` : '`disabled`'}`;
      });
      await interaction.reply({ embeds: [info(lines.join('\n'), 'Log Channel Configuration')], ephemeral: true });
    }

    else if (sub === 'test') {
      const event     = interaction.options.getString('event');
      const channelId = guildDoc.logChannels?.[event];
      if (!channelId) return interaction.reply({ embeds: [info(`No log channel set for **${event}**.`)], ephemeral: true });
      await logService.send(client, channelId, {
        type:  'test',
        color: 'info',
        title: `Test Log — ${event}`,
        fields: [{ name: 'Triggered by', value: `<@${interaction.user.id}>`, inline: true }],
      });
      await interaction.reply({ embeds: [success(`Test log sent to <#${channelId}>.`)], ephemeral: true });
    }

    else if (sub === 'ignore') {
      const channel = interaction.options.getChannel('channel');
      const list    = guildDoc.ignoredLogChannels || [];
      if (list.includes(channel.id)) {
        guildDoc.ignoredLogChannels = list.filter(id => id !== channel.id);
        await guildDoc.save();
        await interaction.reply({ embeds: [success(`<#${channel.id}> removed from log ignore list.`)], ephemeral: true });
      } else {
        guildDoc.ignoredLogChannels.push(channel.id);
        await guildDoc.save();
        await interaction.reply({ embeds: [success(`<#${channel.id}> added to log ignore list.`)], ephemeral: true });
      }
    }
  },
};
