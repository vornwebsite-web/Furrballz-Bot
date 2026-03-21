'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { noPermission }  = require('../utils/errors');
const { isModerator }   = require('../utils/permissions');
const { paginate }      = require('../utils/paginator');
const { AttachmentBuilder } = require('discord.js');

const ACTION_MAP = {
  ban:     AuditLogEvent.MemberBanAdd,
  unban:   AuditLogEvent.MemberBanRemove,
  kick:    AuditLogEvent.MemberKick,
  channel: AuditLogEvent.ChannelCreate,
  role:    AuditLogEvent.RoleCreate,
  bot:     AuditLogEvent.BotAdd,
};

module.exports = {
  cooldown: 5000,
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('View Discord audit log')
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
    .addSubcommand(s => s
      .setName('search')
      .setDescription('Search recent audit log entries')
      .addStringOption(o => o.setName('action').setDescription('Action type').setRequired(true)
        .addChoices(
          { name: 'Bans',     value: 'ban'     },
          { name: 'Unbans',   value: 'unban'   },
          { name: 'Kicks',    value: 'kick'    },
          { name: 'Channels', value: 'channel' },
          { name: 'Roles',    value: 'role'    },
          { name: 'Bots added', value: 'bot'  },
        ))
      .addIntegerOption(o => o.setName('limit').setDescription('Number of entries (1–50)').setMinValue(1).setMaxValue(50)))
    .addSubcommand(s => s
      .setName('user')
      .setDescription('View recent audit actions by a user')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)))
    .addSubcommand(s => s
      .setName('channel')
      .setDescription('Fetch recent audit entries for a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('bot').setDescription('List recently added bots'))
    .addSubcommand(s => s.setName('role').setDescription('Recent role create/delete entries'))
    .addSubcommand(s => s
      .setName('export')
      .setDescription('Export recent audit log to a text file')
      .addIntegerOption(o => o.setName('limit').setDescription('Entries to export (max 100)').setMinValue(1).setMaxValue(100))),

  async execute(interaction) {
    if (!isModerator(interaction.member)) return noPermission(interaction);
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'search') {
      const action = interaction.options.getString('action');
      const limit  = interaction.options.getInteger('limit') || 10;
      const logs   = await interaction.guild.fetchAuditLogs({ type: ACTION_MAP[action], limit }).catch(() => null);
      if (!logs?.entries.size) return interaction.editReply({ embeds: [info('No entries found.')] });
      const lines = [...logs.entries.values()].map(e =>
        `**${e.executor?.tag || 'Unknown'}** → **${e.target?.tag || e.target?.name || String(e.targetId)}** — <t:${Math.floor(e.createdTimestamp / 1000)}:R>${e.reason ? `\n*Reason: ${e.reason.slice(0, 100)}*` : ''}`
      );
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) pages.push(neutral(lines.slice(i, i + 5).join('\n\n'), `Audit Log — ${action}`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'user') {
      const user = interaction.options.getUser('user');
      const logs = await interaction.guild.fetchAuditLogs({ limit: 20 }).catch(() => null);
      if (!logs) return interaction.editReply({ embeds: [info('Could not fetch audit log.')] });
      const entries = [...logs.entries.values()].filter(e => e.executor?.id === user.id);
      if (!entries.length) return interaction.editReply({ embeds: [info(`No recent audit actions by **${user.tag}**.`)] });
      const lines = entries.map(e => `Action \`${e.action}\` on **${e.target?.tag || e.target?.name || String(e.targetId)}** — <t:${Math.floor(e.createdTimestamp / 1000)}:R>`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), `Audit — ${user.tag}`));
      await paginate(interaction, pages, { ephemeral: true });
    }

    else if (sub === 'bot') {
      const logs = await interaction.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 20 }).catch(() => null);
      if (!logs?.entries.size) return interaction.editReply({ embeds: [info('No bots added recently.')] });
      const lines = [...logs.entries.values()].map(e =>
        `Bot: **${e.target?.tag || String(e.targetId)}** added by **${e.executor?.tag || 'Unknown'}** — <t:${Math.floor(e.createdTimestamp / 1000)}:R>`
      );
      await interaction.editReply({ embeds: [neutral(lines.join('\n'), 'Recently Added Bots')] });
    }

    else if (sub === 'role') {
      const logs = await interaction.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 20 }).catch(() => null);
      if (!logs?.entries.size) return interaction.editReply({ embeds: [info('No recent role changes.')] });
      const lines = [...logs.entries.values()].map(e =>
        `Role **${e.target?.name || String(e.targetId)}** created by **${e.executor?.tag || 'Unknown'}** — <t:${Math.floor(e.createdTimestamp / 1000)}:R>`
      );
      await interaction.editReply({ embeds: [neutral(lines.join('\n'), 'Recent Role Creates')] });
    }

    else if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      const logs    = await interaction.guild.fetchAuditLogs({ limit: 20 }).catch(() => null);
      if (!logs) return interaction.editReply({ embeds: [info('Could not fetch audit log.')] });
      const entries = [...logs.entries.values()].filter(e => e.targetId === channel.id);
      if (!entries.length) return interaction.editReply({ embeds: [info(`No audit entries for <#${channel.id}>.`)] });
      const lines = entries.map(e => `Action \`${e.action}\` by **${e.executor?.tag || 'Unknown'}** — <t:${Math.floor(e.createdTimestamp / 1000)}:R>`);
      await interaction.editReply({ embeds: [neutral(lines.join('\n'), `Audit — #${channel.name}`)] });
    }

    else if (sub === 'export') {
      const limit = interaction.options.getInteger('limit') || 50;
      const logs  = await interaction.guild.fetchAuditLogs({ limit }).catch(() => null);
      if (!logs?.entries.size) return interaction.editReply({ embeds: [info('No audit entries.')] });
      const text  = [...logs.entries.values()].map(e =>
        `[${new Date(e.createdTimestamp).toISOString()}] Action:${e.action} | Executor:${e.executor?.tag || 'Unknown'} | Target:${e.target?.tag || e.target?.name || String(e.targetId)} | Reason:${e.reason || 'None'}`
      ).join('\n');
      const buf  = Buffer.from(text, 'utf8');
      const file = new AttachmentBuilder(buf, { name: `audit-${interaction.guild.id}-${Date.now()}.txt` });
      await interaction.editReply({ files: [file], embeds: [info(`Exported **${logs.entries.size}** audit log entries.`)] });
    }
  },
};
