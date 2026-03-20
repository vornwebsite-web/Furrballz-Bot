'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const axios      = require('axios');
const SocialFeed = require('../models/SocialFeed');
const { buildEmbed } = require('../utils/embedBuilder');
const logger     = require('../utils/logger');
const config     = require('../config');

/**
 * Starts the social polling interval.
 * @param {import('discord.js').Client} client
 */
function start(client) {
  setInterval(() => poll(client), config.intervals.socialPoller);
  logger.info('[SocialPoller] Started — interval: ' + config.intervals.socialPoller + 'ms');
}

/**
 * Polls all active non-Twitch feeds for new content.
 */
async function poll(client) {
  try {
    const feeds = await SocialFeed.find({
      paused:   false,
      platform: { $in: ['youtube', 'tiktok', 'instagram'] },
    });

    for (const feed of feeds) {
      try {
        switch (feed.platform) {
          case 'youtube':  await pollYouTube(feed, client);  break;
          case 'tiktok':   await pollTikTok(feed, client);   break;
          case 'instagram':await pollInstagram(feed, client);break;
        }
      } catch (err) {
        logger.warn(`[SocialPoller] Feed ${feed.platform}/${feed.handle} error: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[SocialPoller] Poll cycle error: ${err.message}`);
  }
}

// ── YouTube ───────────────────────────────────────────────────────────────────

async function pollYouTube(feed, client) {
  if (!config.youtubeApiKey) return;

  const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      key:        config.youtubeApiKey,
      channelId:  feed.handle,
      part:       'snippet',
      order:      'date',
      maxResults: 1,
      type:       'video',
    },
    timeout: 10000,
  });

  const item = res.data?.items?.[0];
  if (!item) return;

  const videoId = item.id?.videoId;
  if (!videoId || videoId === feed.lastPostId) return;

  feed.lastPostId = videoId;
  await feed.save();

  const url     = `https://www.youtube.com/watch?v=${videoId}`;
  const title   = item.snippet?.title;
  const channel = item.snippet?.channelTitle;

  await notify(feed, client, {
    platform: 'YouTube',
    color:    'error',
    title:    `📺 New YouTube Video — ${channel}`,
    description: `**[${title}](${url})**`,
    url,
    image: item.snippet?.thumbnails?.high?.url,
  });
}

// ── TikTok ────────────────────────────────────────────────────────────────────
// TikTok has no public API — uses rss.app or similar RSS bridge
async function pollTikTok(feed, client) {
  // Using an RSS-to-JSON service as a fallback approach
  // Replace RSS_BRIDGE_URL with your preferred service (rss.app, rsshub, etc.)
  const rssUrl = `https://rsshub.app/tiktok/user/@${feed.handle}`;

  const res = await axios.get(`https://api.rss2json.com/v1/api.json`, {
    params: { rss_url: rssUrl },
    timeout: 10000,
  });

  const item = res.data?.items?.[0];
  if (!item) return;

  const postId = item.guid || item.link;
  if (!postId || postId === feed.lastPostId) return;

  feed.lastPostId = postId;
  await feed.save();

  await notify(feed, client, {
    platform:    'TikTok',
    color:       'neutral',
    title:       `🎵 New TikTok — @${feed.handle}`,
    description: `**[${item.title || 'New Video'}](${item.link})**`,
    url:         item.link,
    image:       item.thumbnail || null,
  });
}

// ── Instagram ─────────────────────────────────────────────────────────────────
async function pollInstagram(feed, client) {
  const rssUrl = `https://rsshub.app/instagram/user/${feed.handle}`;

  const res = await axios.get(`https://api.rss2json.com/v1/api.json`, {
    params: { rss_url: rssUrl },
    timeout: 10000,
  });

  const item = res.data?.items?.[0];
  if (!item) return;

  const postId = item.guid || item.link;
  if (!postId || postId === feed.lastPostId) return;

  feed.lastPostId = postId;
  await feed.save();

  await notify(feed, client, {
    platform:    'Instagram',
    color:       'primary',
    title:       `📸 New Instagram Post — @${feed.handle}`,
    description: `**[View Post](${item.link})**\n\n${item.description?.slice(0, 200) || ''}`,
    url:         item.link,
    image:       item.thumbnail || null,
  });
}

// ── Shared notify helper ──────────────────────────────────────────────────────

async function notify(feed, client, data) {
  const channel = await client.channels.fetch(feed.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = buildEmbed({
    type:        data.color || 'primary',
    title:       data.title,
    description: data.description,
    image:       data.image  || null,
    url:         data.url    || null,
  });

  const content = feed.pingRoleId ? `<@&${feed.pingRoleId}> ${feed.message || ''}`.trim() : (feed.message || undefined);

  await channel.send({
    content,
    embeds: [embed],
    allowedMentions: { roles: feed.pingRoleId ? [feed.pingRoleId] : [] },
  });
}

module.exports = { start, poll, notify };
