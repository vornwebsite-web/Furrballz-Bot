'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────
// Run this script whenever you add or change slash commands:
//   node deploy-commands.js

const { REST, Routes } = require('@discordjs/rest');
const fs     = require('fs');
const path   = require('path');
const config = require('./config');
const logger = require('./utils/logger');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if (!command.data) {
      logger.warn(`[Deploy] Skipping ${file} — no data export.`);
      continue;
    }
    commands.push(command.data.toJSON());
    logger.info(`[Deploy] Queued /${command.data.name}`);
  } catch (err) {
    logger.error(`[Deploy] Failed to load ${file}: ${err.message}`);
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    logger.info(`[Deploy] Registering ${commands.length} slash command groups to Discord...`);

    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    logger.info(`[Deploy] Successfully registered ${data.length} application commands globally.`);
    logger.info('[Deploy] Note: Global commands can take up to 1 hour to propagate.');
  } catch (err) {
    logger.error(`[Deploy] Registration failed: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
})();
