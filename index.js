'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────
// Licensed under the MIT License. See LICENSE for details.

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs        = require('fs');
const path      = require('path');
const mongoose  = require('mongoose');
const config    = require('./config');
const logger    = require('./utils/logger');

// ── Create Discord client ─────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true,
  },
});

// ── Attach collections to client ──────────────────────────────────────────────
client.commands   = new Collection(); // slash commands
client.cooldowns  = new Collection(); // per-user cooldowns
client.snipeCache = new Map();        // deleted message snipe cache per channel
client.inviteCache = new Map();       // invite usage cache per guild

// ── Load commands ─────────────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command.data || !command.execute) {
      logger.warn(`[Commands] Skipping ${file} — missing data or execute export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
    logger.info(`[Commands] Loaded /${command.data.name}`);
  } catch (err) {
    logger.error(`[Commands] Failed to load ${file}: ${err.message}`);
  }
}

// ── Load events ───────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  try {
    const event = require(path.join(eventsPath, file));
    if (!event.name || !event.execute) {
      logger.warn(`[Events] Skipping ${file} — missing name or execute export.`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`[Events] Registered ${event.name}`);
  } catch (err) {
    logger.error(`[Events] Failed to load ${file}: ${err.message}`);
  }
}

// ── Connect to MongoDB ────────────────────────────────────────────────────────
async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('[Database] Connected to MongoDB Atlas');
  } catch (err) {
    logger.error(`[Database] Connection failed: ${err.message}`);
    process.exit(1);
  }
}

// ── Start dashboard ───────────────────────────────────────────────────────────
function startDashboard() {
  try {
    const dashboard = require('./dashboard/core/server');
    dashboard.start(client);
    logger.info(`[Dashboard] Running on port ${config.port}`);
  } catch (err) {
    logger.error(`[Dashboard] Failed to start: ${err.message}`);
  }
}

// ── Global error handling ─────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error(`[Process] Unhandled rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`[Process] Uncaught exception: ${err.message}`);
  logger.error(err.stack);
});

process.on('SIGTERM', async () => {
  logger.info('[Process] SIGTERM received — shutting down gracefully...');
  client.destroy();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Process] SIGINT received — shutting down gracefully...');
  client.destroy();
  await mongoose.connection.close();
  process.exit(0);
});

// ── Boot sequence ─────────────────────────────────────────────────────────────
(async () => {
  logger.info(`[Boot] Starting ${config.botName} v${config.botVersion}...`);

  await connectDatabase();
  startDashboard();

  await client.login(config.token);
  logger.info('[Boot] Discord login successful');

  // ── Auto-register slash commands ───────────────────────────────────────────
  // Runs on every boot — Discord deduplicates unchanged commands automatically
  try {
    const { REST, Routes } = require('@discordjs/rest');
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    const body = [];
    for (const file of commandFiles) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.data) body.push(cmd.data.toJSON());
      } catch { /* skip broken command files */ }
    }
    const rest = new REST({ version: '10' }).setToken(config.token);
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info(`[Deploy] Registered ${body.length} slash commands globally.`);
  } catch (err) {
    logger.warn(`[Deploy] Command registration failed: ${err.message}`);
    // Non-fatal — bot still runs, just commands may be stale
  }
})();

module.exports = client;
