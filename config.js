'use strict';

require('dotenv').config();

// ── Validate required environment variables ───────────────────────────────────
const REQUIRED = [
  'TOKEN',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'MONGO_URI',
  'SESSION_SECRET',
  'OWNER_ID',
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Config] Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('[Config] Copy .env.example to .env and fill in all values.');
  process.exit(1);
}

// ── Export single config object ───────────────────────────────────────────────
const config = {
  // Discord
  token:        process.env.TOKEN,
  clientId:     process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  ownerId:      process.env.OWNER_ID,

  // Database
  mongoUri: process.env.MONGO_URI,

  // Dashboard
  port:          parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: process.env.SESSION_SECRET,
  baseUrl:       process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  // Optional social APIs
  youtubeApiKey:      process.env.YOUTUBE_API_KEY || null,
  twitchClientId:     process.env.TWITCH_CLIENT_ID || null,
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || null,

  // Bot branding
  botName:    'Furrballz Bot™',
  botVersion: '1.0.0',
  color: {
    primary: 0x7F77DD,   // purple — main brand color
    success: 0x1D9E75,   // teal
    error:   0xE24B4A,   // red
    warning: 0xEF9F27,   // amber
    info:    0x378ADD,   // blue
    neutral: 0x888780,   // gray
  },

  // Intervals (milliseconds)
  intervals: {
    socialPoller:  5  * 60 * 1000,  // 5 minutes
    twitchPoller:  2  * 60 * 1000,  // 2 minutes
    reminderCheck: 1  * 60 * 1000,  // 1 minute
    birthdayCheck: 60 * 60 * 1000,  // 1 hour
    muteSweep:     1  * 60 * 1000,  // 1 minute
    antiRaidWindow: 10 * 1000,      // 10 seconds join window
  },

  // Limits
  limits: {
    warnBeforeAutoban:  5,
    maxBackupsPerGuild: 10,
    ticketTranscriptMaxMessages: 500,
    paginatorTimeout: 60 * 1000,    // 60 seconds
    commandCooldownDefault: 3000,   // 3 seconds
  },
};

module.exports = config;
