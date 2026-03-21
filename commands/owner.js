'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply }  = require('../utils/errors');
const { isOwner }     = require('../utils/permissions');
const BotConfig       = require('../models/BotConfig');
const Blacklist       = require('../models/Blacklist');
const logger          = require('../utils/logger');

module.exports = {
  cooldown: 1000,

  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Bot owner only commands')

    // ── mode ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('mode')
      .setDescription('Switch bot between public and private mode')
      .addStringOption(o => o.setName('mode').setDescription('public or private').setRequired(true)
        .addChoices({ name: 'Public', value: 'public' }, { name: 'Private', value: 'private' })))

    // ── status ────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('status')
      .setDescription('View current bot status and config'))

    // ── maintenance ───────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('maintenance')
      .setDescription('Toggle maintenance mode')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable maintenance').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Custom maintenance message')))

    // ── blacklist ─────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('blacklist')
      .setDescription('Blacklist or unblacklist a user or guild')
      .addStringOption(o => o.setName('action').setDescription('add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addStringOption(o => o.setName('id').setDescription('User or guild ID').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('user or guild').setRequired(true)
        .addChoices({ name: 'User', value: 'user' }, { name: 'Guild', value: 'guild' }))
      .addStringOption(o => o.setName('reason').setDescription('Reason for blacklist')))

    // ── servers ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('servers')
      .setDescription('List all servers the bot is in'))

    // ── reload ────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('reload')
      .setDescription('Reload a command file')
      .addStringOption(o => o.setName('command').setDescription('Command name to reload').setRequired(true)))

    // ── eval ──────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('eval')
      .setDescription('Evaluate JavaScript code (DANGEROUS)')
      .addStringOption(o => o.setName('code').setDescription('Code to evaluate').setRequired(true)))

    // ── announce ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('announce')
      .setDescription('Send a global announcement to all guild system channels')
      .addStringOption(o => o.setName('message').setDescription('Announcement message').setRequired(true))),

  async execute(interaction, client) {
    // All subcommands are owner-only
    if (!isOwner(interaction.user.id)) {
      return errorReply(interaction, 'This command is restricted to the bot owner.', 'Access Denied');
    }

    const sub = interaction.options.getSubcommand();

    // ── mode ──────────────────────────────────────────────────────────────────
    if (sub === 'mode') {
      const mode = interaction.options.getString('mode');
      const cfg  = await BotConfig.get();
      cfg.mode   = mode;
      await cfg.save();
      await interaction.reply({
        embeds: [success(`Bot mode set to **${mode}**.\n${mode === 'private' ? 'Only allowed guilds can use the bot.' : 'All guilds can use the bot.'}`)],
        ephemeral: true,
      });
      logger.info(`[Owner] Mode changed to ${mode} by ${interaction.user.tag}`);
    }

    // ── status ────────────────────────────────────────────────────────────────
    else if (sub === 'status') {
      const cfg = await BotConfig.get();
      const embed = info(
        [
          `**Mode:** ${cfg.mode}`,
          `**Maintenance:** ${cfg.maintenance ? '🔴 Enabled' : '🟢 Disabled'}`,
          `**Presence:** ${cfg.presenceType} ${cfg.presenceText}`,
          `**Guilds:** ${client.guilds.cache.size}`,
          `**Users:** ${client.users.cache.size}`,
          `**Uptime:** ${Math.floor(process.uptime() / 60)}m`,
          `**Memory:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
          `**Allowed guilds:** ${cfg.allowedGuilds.length}`,
          `**Blacklisted users:** ${cfg.blacklistedUsers.length}`,
          `**Blacklisted guilds:** ${cfg.blacklistedGuilds.length}`,
        ].join('\n'),
        'Bot Status',
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── maintenance ───────────────────────────────────────────────────────────
    else if (sub === 'maintenance') {
      const enabled = interaction.options.getBoolean('enabled');
      const msg     = interaction.options.getString('message');
      const cfg     = await BotConfig.get();
      cfg.maintenance = enabled;
      if (msg) cfg.maintenanceMessage = msg;
      await cfg.save();
      await interaction.reply({
        embeds: [success(`Maintenance mode **${enabled ? 'enabled' : 'disabled'}**.`)],
        ephemeral: true,
      });
      logger.info(`[Owner] Maintenance ${enabled ? 'enabled' : 'disabled'} by ${interaction.user.tag}`);
    }

    // ── blacklist ─────────────────────────────────────────────────────────────
    else if (sub === 'blacklist') {
      const action = interaction.options.getString('action');
      const id     = interaction.options.getString('id');
      const type   = interaction.options.getString('type');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const cfg    = await BotConfig.get();

      if (action === 'add') {
        await Blacklist.findOneAndUpdate(
          { targetId: id, targetType: type },
          { targetId: id, targetType: type, reason, bannedBy: interaction.user.id },
          { upsert: true },
        );
        if (type === 'user' && !cfg.blacklistedUsers.includes(id)) cfg.blacklistedUsers.push(id);
        if (type === 'guild' && !cfg.blacklistedGuilds.includes(id)) cfg.blacklistedGuilds.push(id);
        await cfg.save();
        await interaction.reply({ embeds: [success(`\`${id}\` (${type}) has been blacklisted.`)], ephemeral: true });
      } else {
        await Blacklist.deleteOne({ targetId: id, targetType: type });
        if (type === 'user')  cfg.blacklistedUsers  = cfg.blacklistedUsers.filter(u => u !== id);
        if (type === 'guild') cfg.blacklistedGuilds = cfg.blacklistedGuilds.filter(g => g !== id);
        await cfg.save();
        await interaction.reply({ embeds: [success(`\`${id}\` (${type}) has been removed from blacklist.`)], ephemeral: true });
      }
    }

    // ── servers ───────────────────────────────────────────────────────────────
    else if (sub === 'servers') {
      const guilds = [...client.guilds.cache.values()];
      const lines  = guilds.map((g, i) => `${i + 1}. **${g.name}** (\`${g.id}\`) — ${g.memberCount} members`);
      const pages  = [];
      for (let i = 0; i < lines.length; i += 10) {
        pages.push(neutral(lines.slice(i, i + 10).join('\n'), `Servers (${guilds.length} total)`));
      }
      const { paginate } = require('../utils/paginator');
      await paginate(interaction, pages, { ephemeral: true });
    }

    // ── reload ────────────────────────────────────────────────────────────────
    else if (sub === 'reload') {
      const cmdName = interaction.options.getString('command').toLowerCase();
      const path    = require('path');
      const cmdPath = path.join(__dirname, `${cmdName}.js`);
      try {
        delete require.cache[require.resolve(cmdPath)];
        const reloaded = require(cmdPath);
        client.commands.set(reloaded.data.name, reloaded);
        await interaction.reply({ embeds: [success(`Command \`/${cmdName}\` has been reloaded.`)], ephemeral: true });
        logger.info(`[Owner] Reloaded /${cmdName}`);
      } catch (err) {
        await interaction.reply({ embeds: [error(`Failed to reload: ${err.message}`)], ephemeral: true });
      }
    }

    // ── eval ──────────────────────────────────────────────────────────────────
    else if (sub === 'eval') {
      const code = interaction.options.getString('code');
      await interaction.deferReply({ ephemeral: true });
      try {
        // eslint-disable-next-line no-eval
        let result = eval(code);
        if (result instanceof Promise) result = await result;
        const output = String(result).slice(0, 1900);
        await interaction.editReply({ embeds: [success(`\`\`\`js\n${output}\n\`\`\``, 'Eval Result')] });
      } catch (err) {
        await interaction.editReply({ embeds: [error(`\`\`\`\n${err.message}\n\`\`\``)] });
      }
    }

    // ── announce ──────────────────────────────────────────────────────────────
    else if (sub === 'announce') {
      const message = interaction.options.getString('message');
      await interaction.deferReply({ ephemeral: true });
      let sent = 0;
      for (const [, g] of client.guilds.cache) {
        try {
          const systemChannel = g.systemChannel;
          if (systemChannel?.isTextBased()) {
            await systemChannel.send({ content: message });
            sent++;
          }
        } catch { /* ignore guilds where we can't send */ }
      }
      await interaction.editReply({ embeds: [success(`Announcement sent to **${sent}** server(s).`)] });
    }
  },
};
