<div align="center">

# 🐾 Furrballz Bot™

**The official bot of TheFurrballz Hotel Discord server.**
Built with discord.js v14 · MongoDB · Express Dashboard · Railway hosted

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org)
[![Status](https://img.shields.io/badge/status-private-red.svg)]()

</div>

---

## Overview

Furrballz Bot™ is a full-featured, ultra-quality private Discord bot built exclusively for **TheFurrballz Hotel** and its test server. It includes 40 slash command groups (~240 subcommands), a web dashboard, advanced moderation, anti-nuke protection, server backup/restore, giveaways, social notifiers, leveling, economy, and much more.

---

## Features

| Category | Features |
|---|---|
| **Moderation** | Ban, kick, warn, mute, timeout, purge, lock, slowmode, case logs, warn history |
| **Anti-Nuke** | Mass action detection, auto-punishment, whitelist, threshold config, alert logs |
| **Anti-Raid** | Join rate monitoring, auto-lockdown, mod alerts, auto-restore |
| **Anti-Spam** | Message rate limiting, action on breach, channel/role whitelist |
| **Automod** | Word filter, invite filter, mention spam, caps filter, action config |
| **Tickets** | Panel builder, claim/close/delete, transcripts, category config, autoclose |
| **Logging** | Per-event log channels — messages, members, roles, channels, voice, bans |
| **Audit** | Searchable audit log — filter by user, channel, role, action type |
| **Backup** | Full guild snapshot (roles, channels, perms, settings), restore, schedule |
| **Giveaways** | Timed giveaways, requirements, pause/resume, reroll, dashboard |
| **Events** | Guild events with RSVP, reminders, winner selection |
| **Raffle** | Entry-based raffles with draw and winner announcement |
| **Social** | TikTok, YouTube, Instagram, Twitch live notifiers |
| **Leveling** | XP system, level-up announcements, level role rewards, leaderboard |
| **Economy** | Balance, daily, work, shop, inventory, pay |
| **Welcome** | Custom welcome embeds, DM, auto-role, variable support |
| **Roles** | Auto-role, reaction roles, verify gate, boost perks |
| **Starboard** | Star threshold, starboard channel, ignore list |
| **Counting** | Counting channel, highscore, leaderboard, reset |
| **Tags** | Custom server tags with uses tracking |
| **Polls** | Timed polls with multiple options and live results |
| **Suggestions** | Suggestion channel with approve/deny workflow |
| **Birthdays** | Birthday announcements, temp role, daily check |
| **Reminders** | Personal DM reminders with natural duration parsing |
| **AFK** | AFK status with auto-ping reply |
| **Fun** | 8ball, coinflip, dice, RPS, meme, joke |
| **Trivia** | Category-based trivia with scoring and leaderboard |
| **Wordle** | Discord Wordle game with stats tracking |
| **Music** | Play, queue, skip, shuffle, loop via voice |
| **Embeds** | Custom embed creator and sender |
| **Announce** | Scheduled announcements with edit/cancel |
| **Sticky** | Sticky messages that repost on new messages |
| **Invites** | Invite tracking, leaderboard, info |
| **Partnership** | Partner server manager with bump system |
| **Temp Voice** | Auto-create/delete voice channels |
| **Dashboard** | Full web dashboard — all config, no commands needed |
| **Owner** | Public/private mode toggle, eval, blacklist, maintenance, reload |
| **Bot Config** | Presence, avatar, name, invite link config via command |

---

## Tech Stack

- **Runtime** — Node.js 18+
- **Discord library** — discord.js v14
- **Database** — MongoDB Atlas via Mongoose
- **Dashboard** — Express + EJS + Chart.js
- **Auth** — Discord OAuth2 via Passport.js
- **Hosting** — Railway (bot + dashboard on same process, port 3000)
- **Source control** — GitHub (web editor + Railway auto-deploy)

---

## Project Structure

```
furrballz-bot/
├── index.js                  ← Entry point
├── config.js                 ← Environment config loader
├── deploy-commands.js        ← Slash command registration
├── commands/                 ← 40 slash command group files
├── events/                   ← 24 Discord event handlers
├── services/                 ← 17 business logic services
├── models/                   ← 23 Mongoose data models
├── dashboard/
│   ├── server.js             ← Express app (port 3000)
│   ├── routes/               ← 20 dashboard route files
│   ├── views/                ← 17 EJS view templates
│   └── public/               ← CSS, client JS
└── utils/                    ← 12 shared helper utilities
```

---

## Setup

### Prerequisites

- Node.js 18 or higher
- A MongoDB Atlas cluster (free tier works)
- A Discord application with bot token
- A Railway account

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/furrballz-bot.git
cd furrballz-bot
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Your Discord application client ID |
| `CLIENT_SECRET` | Your Discord application client secret (OAuth2) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Random string for Express session signing |
| `OWNER_ID` | Your Discord user ID (grants owner commands) |
| `PORT` | Dashboard port (default `3000`) |

### 3. Register slash commands

```bash
node deploy-commands.js
```

This registers all 40 command groups to Discord. Only needs to be run when commands change.

### 4. Run the bot

```bash
node index.js
```

The bot and dashboard will both start. Dashboard is available at `http://localhost:3000`.

---

## Deploying to Railway

1. Push your code to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add all environment variables in Railway's **Variables** tab
4. Railway will auto-deploy on every push to `main`
5. The dashboard will be available at your Railway-generated domain on port 3000

> **Note:** Add your Railway domain to your Discord application's OAuth2 redirect URIs:
> `https://your-domain.railway.app/auth/callback`

---

## Bot Modes

Furrballz Bot™ supports two operating modes controlled by the `/owner mode` command:

- **Private mode** — Bot only responds in whitelisted guilds (default)
- **Public mode** — Bot responds in any guild it is added to

Mode state is persisted in the `BotConfig` MongoDB collection.

---

## Dashboard

The web dashboard runs on the same Railway process as the bot on port 3000. It provides full configuration for every feature without needing to use commands.

**Access:** Navigate to your Railway domain → log in with Discord → select your server.

Dashboard requires the user to share at least one server with the bot and have **Manage Server** permission in that server.

---

## Commands Overview

All commands use Discord's slash command system. Each file in `commands/` is one command group with up to 25 subcommands.

| Group | Subcommands |
|---|---|
| `/mod` | ban, kick, warn, mute, unmute, timeout, purge, lock, slowmode, case, history, clearwarns |
| `/antinuke` | enable, disable, whitelist, unwhitelist, punishment, threshold, logs, status |
| `/backup` | create, load, list, delete, schedule, info, preview |
| `/antiraid` | enable, disable, lockdown, threshold, action, whitelist, status |
| `/antispam` | enable, disable, threshold, action, whitelist, status |
| `/automod` | enable, disable, filter, threshold, whitelist, blacklist, log, test |
| `/ticket` | panel, open, close, claim, unclaim, rename, transcript, add, remove, delete |
| `/ticketconfig` | category, role, log, limit, message, button, pingrole, autoclose |
| `/logging` | set, disable, view, test, ignore |
| `/audit` | search, user, channel, role, bot, export |
| `/giveaway` | start, end, reroll, pause, resume, list, edit |
| `/event` | create, cancel, edit, list, join, leave, remind, winners |
| `/raffle` | create, enter, draw, list, cancel, winners |
| `/social` | add, remove, list, test, pause, resume |
| `/twitch` | add, remove, list, test, message, role |
| `/roles` | add, remove, info, give, take, autorole, reactionrole |
| `/verify` | setup, panel, approve, deny, log |
| `/welcome` | set, disable, preview, setrole, setdm |
| `/birthday` | set, remove, list, channel, role, upcoming |
| `/level` | rank, leaderboard, setxp, resetxp, setlevelrole, toggle |
| `/eco` | balance, daily, work, pay, leaderboard, shop, buy |
| `/shop` | add, remove, list, edit, buy, inventory, restock |
| `/embed` | create, edit, send, clone, list |
| `/announce` | send, schedule, edit, cancel, list |
| `/sticky` | set, remove, list, pause |
| `/poll` | create, end, results, vote |
| `/suggest` | create, approve, deny, list, setchannel |
| `/starboard` | setup, disable, threshold, ignore, list |
| `/counting` | setup, disable, reset, leaderboard, stats |
| `/util` | serverinfo, userinfo, avatar, banner, ping, uptime, stats |
| `/tag` | create, delete, edit, list, show, raw |
| `/reminder` | set, list, cancel, clear |
| `/afk` | set, remove, status |
| `/fun` | 8ball, coinflip, dice, rps, meme, joke |
| `/trivia` | start, stop, score, leaderboard, category |
| `/wordle` | play, stats, leaderboard |
| `/music` | play, pause, skip, queue, stop, volume, nowplaying, shuffle, loop |
| `/partner` | add, remove, list, bump, channel |
| `/boost` | perks, list, reward, set, remove |
| `/invite` | create, list, info, leaderboard, purge |
| `/owner` | mode, eval, announce, blacklist, servers, reload, maintenance, status |
| `/botconfig` | prefix, presence, avatar, banner, name, invite, support |

---

## License

Copyright © 2026 Furrballz Bot™ — TheFurrballz Hotel.
Licensed under the [MIT License](./LICENSE).
