'use strict';

const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { success, error } = require('../utils/embedBuilder');
const { errorReply }     = require('../utils/errors');
const { isOwner }        = require('../utils/permissions');
const BotConfig          = require('../models/BotConfig');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('botconfig')
    .setDescription('Configure bot-wide settings (owner only)')
    .addSubcommand(s => s
      .setName('prefix')
      .setDescription('Set the legacy prefix (for fallback use)')
      .addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true).setMaxLength(5)))
    .addSubcommand(s => s
      .setName('presence')
      .setDescription('Set bot presence/activity')
      .addStringOption(o => o.setName('type').setDescription('Activity type').setRequired(true)
        .addChoices(
          { name: 'Playing',   value: 'Playing'   },
          { name: 'Watching',  value: 'Watching'  },
          { name: 'Listening', value: 'Listening' },
          { name: 'Competing', value: 'Competing' },
        ))
      .addStringOption(o => o.setName('text').setDescription('Activity text').setRequired(true))
      .addStringOption(o => o.setName('status').setDescription('Online status')
        .addChoices(
          { name: 'Online',  value: 'online'    },
          { name: 'Idle',    value: 'idle'      },
          { name: 'DND',     value: 'dnd'       },
          { name: 'Invisible',value: 'invisible'},
        )))
    .addSubcommand(s => s
      .setName('avatar')
      .setDescription('Change the bot\'s avatar')
      .addStringOption(o => o.setName('url').setDescription('Image URL for new avatar').setRequired(true)))
    .addSubcommand(s => s
      .setName('banner')
      .setDescription('Change the bot\'s banner')
      .addStringOption(o => o.setName('url').setDescription('Image URL for new banner').setRequired(true)))
    .addSubcommand(s => s
      .setName('name')
      .setDescription('Change the bot\'s username')
      .addStringOption(o => o.setName('username').setDescription('New username').setRequired(true).setMaxLength(32)))
    .addSubcommand(s => s
      .setName('invite')
      .setDescription('Set the bot\'s invite link')
      .addStringOption(o => o.setName('url').setDescription('Invite URL').setRequired(true)))
    .addSubcommand(s => s
      .setName('support')
      .setDescription('Set the support server ID')
      .addStringOption(o => o.setName('guild_id').setDescription('Support guild ID').setRequired(true))),

  async execute(interaction, client) {
    if (!isOwner(interaction.user.id)) {
      return errorReply(interaction, 'This command is restricted to the bot owner.', 'Access Denied');
    }

    const sub = interaction.options.getSubcommand();
    const cfg = await BotConfig.get();

    if (sub === 'presence') {
      const type   = interaction.options.getString('type');
      const text   = interaction.options.getString('text');
      const status = interaction.options.getString('status') || 'online';
      const typeMap = { Playing: ActivityType.Playing, Watching: ActivityType.Watching, Listening: ActivityType.Listening, Competing: ActivityType.Competing };
      client.user.setPresence({ status, activities: [{ name: text, type: typeMap[type] }] });
      cfg.presenceType = type;
      cfg.presenceText = text;
      cfg.presenceStatus = status;
      await cfg.save();
      await interaction.reply({ embeds: [success(`Presence updated: **${type} ${text}** (${status})`)], ephemeral: true });
    }

    else if (sub === 'avatar') {
      const url = interaction.options.getString('url');
      await interaction.deferReply({ ephemeral: true });
      try {
        await client.user.setAvatar(url);
        await interaction.editReply({ embeds: [success('Bot avatar updated!')] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    else if (sub === 'banner') {
      const url = interaction.options.getString('url');
      await interaction.deferReply({ ephemeral: true });
      try {
        await client.user.setBanner(url);
        await interaction.editReply({ embeds: [success('Bot banner updated!')] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    else if (sub === 'name') {
      const username = interaction.options.getString('username');
      await interaction.deferReply({ ephemeral: true });
      try {
        await client.user.setUsername(username);
        await interaction.editReply({ embeds: [success(`Bot username changed to **${username}**.`)] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`Failed: ${err.message}`)] });
      }
    }

    else if (sub === 'invite') {
      cfg.inviteLink = interaction.options.getString('url');
      await cfg.save();
      await interaction.reply({ embeds: [success('Bot invite link updated.')], ephemeral: true });
    }

    else if (sub === 'support') {
      cfg.supportServerId = interaction.options.getString('guild_id');
      await cfg.save();
      await interaction.reply({ embeds: [success('Support server ID updated.')], ephemeral: true });
    }

    else if (sub === 'prefix') {
      // Prefix is per-guild, not global — inform user
      await interaction.reply({ embeds: [success('Note: The bot uses slash commands. Legacy prefix is a fallback per-guild setting.\nUse the dashboard to configure per-guild prefix.')], ephemeral: true });
    }
  },
};
