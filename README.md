<div align="center">

<img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Furrballz Bot" width="100" style="border-radius:50%">

# 🐾 Furrballz Bot™

**The official Discord bot of TheFurrballz Hotel.**

[![License: MIT](https://img.shields.io/badge/License-MIT-7F77DD.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-43853d.svg)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)](https://discord.js.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://mongodb.com)
[![Railway](https://img.shields.io/badge/Hosted-Railway-0B0D0E.svg)](https://railway.app)
[![Status](https://img.shields.io/badge/Mode-Private-red.svg)]()

```
191 files  •  54 command groups  •  321 subcommands  •  24 events  •  19 services  •  25 models
```

</div>

---

## ✨ What is Furrballz Bot™?

Furrballz Bot™ is a **full-featured, ultra-quality private Discord bot** built exclusively for TheFurrballz Hotel and its test server. Every command, every embed, every interaction is designed to the highest standard — from the largest moderation workflows to the smallest utility replies.

It ships with:
- **54 slash command groups** with 321 total subcommands
- **Full web dashboard** (Express + EJS + Discord OAuth2)
- **Advanced protection** — anti-nuke, anti-raid, anti-spam, automod
- **Complete economy, leveling, and social systems**
- **Command usage logging** to Discord + console on every invocation
- **Hosted on Railway** — one process, zero cold starts

---

## 🗂 Feature Overview

| Category | What it does |
|---|---|
| 🔨 **Moderation** | Ban, kick, warn, mute, timeout, purge, lock, case logs, warn history, top offenders |
| ⚠️ **Warnings** | Dedicated warn system — add, remove, list, clear, top, recent, case info |
| ☢️ **Anti-Nuke** | Mass action detection, per-action thresholds, auto-punishment, whitelist, alert log |
| 🛡️ **Anti-Raid** | Join rate monitor, auto server lockdown, alert channel, whitelist, auto-restore |
| 📵 **Anti-Spam** | Message rate limiter, configurable action, channel/role whitelist |
| 🤖 **Automod** | Word filter, invite/link/caps/mention filter, per-action config, test mode |
| 🎫 **Tickets** | Panel builder, claim/unclaim/close/delete buttons, transcripts, up to 10 support roles, autoclose |
| 📋 **Logging** | 17 event types each routed to their own channel — messages, members, bans, roles, voice, server |
| 🔍 **Audit** | Searchable Discord audit log — filter by user, channel, action, export to file |
| 💾 **Backup** | Full guild snapshot (roles, channels, permissions, settings), restore, diff preview |
| 🎉 **Giveaways** | Timed giveaways, requirements, pause/resume, reroll, dashboard management |
| 📅 **Events** | Guild events with RSVP, winner selection, start-time reminders |
| 🎟️ **Raffle** | Entry-based raffles with button entry and announced draw |
| 📡 **Social** | YouTube, TikTok, Instagram post notifiers via RSS polling |
| 💜 **Twitch** | Live stream notifier with custom message and ping role per streamer |
| ⬆️ **Leveling** | XP system, level-up announcements, role rewards, leaderboard, admin controls |
| 💰 **Economy** | Balance, daily, work, pay, shop, inventory, buy, leaderboard |
| 🛒 **Shop** | Full shop management — add, remove, edit, restock, role items, stock limits |
| 👋 **Welcome** | Custom welcome embeds, DM messages, auto-role, template variables |
| 🎭 **Roles** | Auto-role, role give/take mass actions, role info |
| 🔁 **Reaction Roles** | Add/remove emoji→role mappings, list, clear per message |
| ✅ **Verify** | Verification gate with button panel, manual approve/deny, log channel |
| 🎂 **Birthdays** | Birthday announcements, temp birthday role, upcoming list |
| ⭐ **Starboard** | Star threshold, dedicated channel, ignored channels |
| 🔢 **Counting** | Counting channel with highscore, reset protection, broken-by tracking |
| 💡 **Suggestions** | Auto-react ✅/❌ in suggestion channel, vote tracking, approve/deny dashboard |
| 🏷️ **Tags** | Server tag library with usage tracking and autocomplete |
| 📊 **Polls** | Multi-option timed polls with live reaction results |
| ⏰ **Reminders** | Personal DM reminders with duration parsing, list, cancel |
| 😴 **AFK** | AFK status with auto-ping reply and return detection |
| 🎵 **Music** | Play, queue, skip, shuffle, loop, volume — voice backend ready |
| 🧵 **Threads** | Create, archive, lock, rename, list threads via command |
| 🎤 **Temp Voice** | Auto-created voice channels — rename, limit, lock, transfer, kick |
| 🏷️ **Nickname** | Set, reset, self-set, mass reset nicknames |
| ⏱️ **Slowmode** | Set, disable, presets, per-channel view |
| 🖼️ **Image** | Avatar, banner, server icon, server banner, emoji in full resolution |
| 🔍 **Search** | Wikipedia, dictionary define, GitHub user/repo lookup, hex color info |
| 🎣 **Snipe** | Deleted message snipe cache with clear |
| ⚙️ **Config** | Server prefix, mute role, per-feature reset, full config view |
| 🌐 **Webhooks** | Create, delete, list, send via webhook from command |
| 📣 **Announce** | Immediate or scheduled announcements with role ping, edit, cancel |
| 📌 **Sticky** | Sticky messages that repost on new activity, list, pause |
| 🎮 **Fun** | 8ball, coinflip, dice roller, RPS, meme, joke |
| 🧠 **Trivia** | Category-based trivia with 15s timers, scoring, 10 questions |
| 🟩 **Wordle** | Full Discord Wordle with emoji board, 6 guesses |
| 📨 **Invites** | Invite tracking, leaderboard, create, purge unused |
| 🤝 **Partner** | Partner server manager, bump system, bump channel |
| 💎 **Boost** | Boost announcement, booster list, boost perks display |
| 🖥️ **Dashboard** | Full web UI — every feature configurable without touching commands |
| 👑 **Owner** | Private/public mode, eval, blacklist, maintenance mode, status |
| 🤖 **Bot Config** | Presence, avatar, banner, username, invite, support server |

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+ |
| **Discord** | discord.js v14 |
| **Database** | MongoDB Atlas — Mongoose ODM |
| **Dashboard** | Express.js + EJS templates |
| **Auth** | Discord OAuth2 — passport-discord |
| **Sessions** | connect-mongo (MongoDB-backed sessions) |
| **Hosting** | Railway (bot + dashboard, single process) |
| **Source** | GitHub (web editor → auto-deploy) |

---

## 📁 Project Structure

```
furrballz-bot/                     191 files total
│
├── index.js                       Entry point — loads all events, commands, services
├── config.js                      Environment validation and config export
├── deploy-commands.js             Slash command registration (run once)
├── package.json
├── .env.example                   All required environment variables documented
│
├── commands/                      54 slash command group files (321 subcommands)
│   ├── moderation.js              /mod — 12 subcommands
│   ├── warn.js                    /warn — 7 subcommands
│   ├── tickets.js                 /ticket — 10 subcommands
│   ├── ticketconfig.js            /ticketconfig — 9 subcommands
│   ├── antinuke.js                /antinuke — 8 subcommands
│   ├── backup.js                  /backup — 7 subcommands
│   └── ...                        51 more command files
│
├── events/                        24 Discord gateway event handlers
│   ├── interactionCreate.js       Slash commands, buttons, selects, modals + command logging
│   ├── messageCreate.js           AFK, automod, antispam, counting, sticky, XP, suggestions
│   ├── guildMemberAdd.js          Anti-raid, invite tracking, welcome, auto-roles
│   └── ...                        21 more event files
│
├── services/                      19 pure business-logic services
│   ├── ticketService.js           Ticket open/claim/close/delete with buttons
│   ├── antiNukeService.js         Rolling window action tracking + punishment
│   ├── giveawayService.js         15s sweep loop, end, reroll
│   ├── backupService.js           Guild snapshot, restore, diff preview
│   └── ...                        15 more service files
│
├── models/                        25 Mongoose schemas
│   ├── Guild.js                   Master per-guild config document
│   ├── TicketConfig.js            Ticket system config (up to 10 support roles)
│   ├── AntiNuke.js                Anti-nuke thresholds and action log
│   └── ...                        22 more model files
│
├── utils/                         12 shared helpers
│   ├── embedBuilder.js            Ultra-branded embed factory with typed shorthands
│   ├── permissions.js             Role hierarchy checks
│   ├── timeParser.js              Duration string parser with bounds validation
│   └── ...                        9 more utility files
│
└── dashboard/                     49 files — full web control panel
    ├── core/
    │   └── server.js              Express app — OAuth2, sessions, all routes
    ├── routes/                    22 route files (one per dashboard section)
    ├── views/                     23 EJS views + 2 partials (head/foot)
    └── public/                    style.css, dashboard.js, theme.js
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill every value:

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | ✅ | Discord bot token |
| `CLIENT_ID` | ✅ | Discord application ID |
| `CLIENT_SECRET` | ✅ | Discord OAuth2 client secret |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `SESSION_SECRET` | ✅ | Random 32+ char string for sessions |
| `OWNER_ID` | ✅ | Your Discord user ID |
| `BASE_URL` | ✅ | Dashboard URL e.g. `https://your.railway.app` |
| `PORT` | ✅ | Dashboard port — set `3000` on Railway |
| `TWITCH_CLIENT_ID` | ⚠️ | Required for `/twitch` notifiers |
| `TWITCH_CLIENT_SECRET` | ⚠️ | Required for `/twitch` notifiers |
| `YOUTUBE_API_KEY` | ⚠️ | Required for YouTube social feed |

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- Discord application with bot token

### Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Register slash commands (once, or when commands change)
node deploy-commands.js

# 4. Start
node index.js
# Bot + dashboard both start on port 3000
```

### Deploy to Railway

```
1. Push repo to GitHub
2. New Railway project → Deploy from GitHub repo
3. Variables tab → add all .env values
4. Railway auto-deploys on every push to main
5. Add Railway domain to Discord OAuth2 redirect URIs:
   https://your-domain.up.railway.app/auth/callback
```

---

## 🌐 Dashboard

The dashboard runs on the same Railway process as the bot on port 3000.

**Login:** Visit your Railway domain → **Login with Discord** → select server

**Requirements:** User must have **Manage Server** permission in the target guild and the bot must be in that guild.

**Pages:** Overview · Moderation · Tickets · Logging · Automod · Welcome · Roles · Leveling · Economy · Giveaways · Social · Starboard · Counting · Suggestions · Anti-Nuke · Backup · Owner Panel

---

## 📡 Command Logging

Every slash command invocation is logged in two places:

**1. Console** (always):
```
[CMD] /mod ban • User#0001 (123456789) • [TheFurrballz Hotel] #mod-commands
```

**2. Discord mod-log channel** (if `modAction` log channel is configured):
Sets an embed in your configured mod-action log channel showing the command used, the user, and the channel — so your team can see every bot action in real time.

Configure with: `/logging set event:Mod Actions channel:#your-log-channel`

---

## 🎨 Embed Design System

All bot responses use a unified embed design system (`utils/embedBuilder.js`):

| Type | Color | Badge | Used for |
|---|---|---|---|
| `primary` | 🟣 Purple `#7F77DD` | 🐾 | Default responses |
| `success` | 🟢 Green `#1EBA7A` | ✅ | Confirmations, completions |
| `error` | 🔴 Red `#FF4757` | ❌ | Errors, failures |
| `warning` | 🟡 Amber `#FFA502` | ⚠️ | Cautions, limits |
| `info` | 🔵 Blue `#1A8FE3` | ℹ️ | Information, lists |
| `neutral` | ⚫ Gray `#747D8C` | ◈ | Neutral displays |
| `mod` | 🟠 Orange `#FD9644` | 🔨 | Moderation actions |
| `economy` | 🟡 Gold `#F9CA24` | 🪙 | Economy responses |
| `level` | 🟣 Soft purple `#A29BFE` | ⬆️ | Leveling responses |
| `boost` | 🩷 Pink `#FF6EB4` | 💎 | Boost responses |

---

## 🤝 Command Groups

All 54 slash command groups with subcommand counts:

| Command | Subcommands | Command | Subcommands |
|---|---|---|---|
| `/mod` | 12 | `/warn` | 7 |
| `/ticket` | 10 | `/ticketconfig` | 9 |
| `/antinuke` | 8 | `/antiraid` | 7 |
| `/antispam` | 6 | `/automod` | 9 |
| `/backup` | 7 | `/logging` | 5 |
| `/audit` | 6 | `/appeal` | 5 |
| `/giveaway` | 7 | `/event` | 8 |
| `/raffle` | 6 | `/social` | 6 |
| `/twitch` | 6 | `/level` | 6 |
| `/eco` | 7 | `/shop` | 7 |
| `/roles` | 7 | `/verify` | 5 |
| `/reaction` | 4 | `/welcome` | 5 |
| `/birthday` | 6 | `/starboard` | 5 |
| `/counting` | 5 | `/suggest` | 5 |
| `/poll` | 4 | `/tag` | 6 |
| `/reminder` | 4 | `/afk` | 3 |
| `/util` | 7 | `/image` | 6 |
| `/search` | 4 | `/snipe` | 2 |
| `/config` | 4 | `/slowmode` | 4 |
| `/thread` | 6 | `/nickname` | 4 |
| `/tempvc` | 9 | `/webhook` | 4 |
| `/reaction` | 4 | `/fun` | 6 |
| `/trivia` | 5 | `/wordle` | 4 |
| `/music` | 9 | `/announce` | 5 |
| `/embed` | 5 | `/sticky` | 4 |
| `/partner` | 5 | `/boost` | 5 |
| `/invite` | 5 | `/owner` | 8 |
| `/botconfig` | 7 | | |

**Total: 54 groups · 321 subcommands**

---

## 📜 License

Copyright © 2026 **Furrballz Bot™** — TheFurrballz Hotel.
Licensed under the [MIT License](./LICENSE). All rights reserved.

---

<div align="center">

Made with 🐾 for **TheFurrballz Hotel**

</div>
