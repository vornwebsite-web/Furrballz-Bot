'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const axios      = require('axios');
const SocialFeed = require('../models/SocialFeed');
const { buildEmbed } = require('../utils/embedBuilder');
const logger     = require('../utils/logger');
const config     = require('../config');

// In-memory stream state: Map<handle, boolean>
const streamState = new Map();

// Cached OAuth token
let accessToken  = null;
let tokenExpiry  = 0;

/**
 * Starts the Twitch polling interval.
 * @param {import('discord.js').Client} client
 */
function start(client) {
  if (!config.twitchClientId || !config.twitchClientSecret) {
    logger.warn('[TwitchPoller] No Twitch credentials — skipping Twitch polling');
    return;
  }
  setInterval(() => poll(client), config.intervals.twitchPoller);
  logger.info('[TwitchPoller] Started — interval: ' + config.intervals.twitchPoller + 'ms');
}

/**
 * Gets or refreshes the Twitch app access token.
 */
async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id:     config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type:    'client_credentials',
    },
    timeout: 10000,
  });

  accessToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return accessToken;
}

/**
 * Polls all active Twitch feeds.
 */
async function poll(client) {
  try {
    const feeds = await SocialFeed.find({ platform: 'twitch', paused: false });
    if (feeds.length === 0) return;

    const token   = await getToken();
    const handles = feeds.map(f => f.handle);

    // Batch lookup up to 100 streams at once
    const res = await axios.get('https://api.twitch.tv/helix/streams', {
      params:  { user_login: handles },
      headers: {
        'Client-ID':     config.twitchClientId,
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });

    const liveStreams = new Map(
      (res.data?.data || []).map(s => [s.user_login.toLowerCase(), s])
    );

    for (const feed of feeds) {
      const handle     = feed.handle.toLowerCase();
      const streamData = liveStreams.get(handle);
      const isLive     = !!streamData;
      const wasLive    = streamState.get(handle) ?? false;

      if (isLive && !wasLive) {
        // Just went live
        streamState.set(handle, true);
        await notifyLive(feed, streamData, client);
      } else if (!isLive && wasLive) {
        // Just went offline
        streamState.set(handle, false);
        await notifyOffline(feed, client);
      }
    }
  } catch (err) {
    logger.error(`[TwitchPoller] Poll error: ${err.message}`);
  }
}

async function notifyLive(feed, streamData, client) {
  try {
    const channel = await client.channels.fetch(feed.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const thumbnailUrl = streamData.thumbnail_url
      ?.replace('{width}', '1280')
      .replace('{height}', '720');

    const embed = buildEmbed({
      type:        'error', // Twitch purple-ish, using error (red) as closest
      title:       `🟣 ${streamData.user_name} is now live on Twitch!`,
      description: `**[${streamData.title}](https://twitch.tv/${streamData.user_login})**\n\nPlaying: **${streamData.game_name || 'Unknown'}**\nViewers: **${streamData.viewer_count.toLocaleString()}**`,
      url:         `https://twitch.tv/${streamData.user_login}`,
      image:       thumbnailUrl || null,
    });

    const content = feed.pingRoleId
      ? `<@&${feed.pingRoleId}> ${feed.message || ''}`.trim()
      : (feed.message || undefined);

    await channel.send({
      content,
      embeds: [embed],
      allowedMentions: { roles: feed.pingRoleId ? [feed.pingRoleId] : [] },
    });
  } catch (err) {
    logger.warn(`[TwitchPoller] Live notify failed for ${feed.handle}: ${err.message}`);
  }
}

async function notifyOffline(feed, client) {
  // Optionally notify that the stream ended — many bots skip this
  // Left as a no-op by default; can be enabled via feed config
}

module.exports = { start, poll };
