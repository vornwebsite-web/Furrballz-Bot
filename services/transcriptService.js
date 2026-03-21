'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const fs         = require('fs');
const path       = require('path');
const Ticket     = require('../models/Ticket');
const TicketConfig = require('../models/TicketConfig');
const logService = require('./logService');
const config     = require('../config');
const logger     = require('../utils/logger');

/**
 * Fetches all messages from a channel and generates an HTML transcript.
 * Saves the file locally and posts it to the log channel.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticketDoc - Mongoose Ticket document
 * @param {import('discord.js').Client} client
 */
async function generate(channel, ticketDoc, client) {
  const messages = await fetchAllMessages(channel);
  const html     = buildHTML(channel, ticketDoc, messages);

  // Ensure transcripts directory exists
  const dir = path.join(process.cwd(), 'transcripts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `ticket-${ticketDoc.ticketId}-${Date.now()}.html`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html, 'utf8');

  // Post to log channel
  try {
    const cfg = await TicketConfig.getOrCreate(ticketDoc.guildId);
    if (cfg.logChannelId) {
      const logChannel = await client.channels.fetch(cfg.logChannelId).catch(() => null);
      if (logChannel?.isTextBased()) {
        const { AttachmentBuilder } = require('discord.js');
        const { buildEmbed }        = require('../utils/embedBuilder');

        const embed = buildEmbed({
          type:        'neutral',
          title:       `Transcript — Ticket #${ticketDoc.ticketId}`,
          description: `Closed by <@${ticketDoc.closedById || 'Unknown'}>`,
          fields: [
            { name: 'Opened by', value: `<@${ticketDoc.openerId}>`, inline: true },
            { name: 'Category',  value: ticketDoc.category || 'General', inline: true },
            { name: 'Messages',  value: String(messages.length), inline: true },
          ],
        });

        const attachment = new AttachmentBuilder(filepath, { name: filename });
        await logChannel.send({ embeds: [embed], files: [attachment] });
      }
    }
  } catch (err) {
    logger.warn(`[TranscriptService] Log channel send failed: ${err.message}`);
  }

  // Update ticket with transcript reference
  ticketDoc.transcriptUrl = filename;
  await ticketDoc.save();

  // Clean up local file after 30 seconds
  setTimeout(() => fs.unlink(filepath, () => {}), 30000);
}

/**
 * Fetches all messages from a channel (up to configured limit).
 */
async function fetchAllMessages(channel) {
  const limit   = config.limits?.ticketTranscriptMaxMessages ?? 500;
  const messages = [];
  let   lastId;

  while (messages.length < limit) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {}),
    }).catch(() => null);

    if (!fetched || fetched.size === 0) break;

    messages.push(...fetched.values());
    lastId = fetched.last()?.id;
    if (fetched.size < 100) break;
  }

  return messages.reverse(); // oldest first
}

/**
 * Builds the HTML transcript string.
 */
function buildHTML(channel, ticketDoc, messages) {
  const rows = messages.map(m => {
    const time    = new Date(m.createdTimestamp).toLocaleString();
    const content = escapeHtml(m.content || '')
      .replace(/\n/g, '<br>')
      || (m.attachments.size > 0 ? `<em>[${m.attachments.size} attachment(s)]</em>` : '<em>[empty]</em>');
    const avatar  = m.author.displayAvatarURL({ size: 32, extension: 'png' });

    return `
    <div class="msg">
      <img class="avatar" src="${avatar}" alt="">
      <div class="body">
        <span class="author">${escapeHtml(m.author.tag)}</span>
        <span class="time">${time}</span>
        <div class="content">${content}</div>
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ticket #${ticketDoc.ticketId} Transcript</title>
<style>
  body { background:#1e1f22; color:#dcddde; font-family:sans-serif; padding:24px; margin:0; }
  h1   { color:#7F77DD; margin-bottom:4px; }
  .meta { color:#888; font-size:13px; margin-bottom:24px; }
  .msg  { display:flex; gap:12px; margin-bottom:16px; align-items:flex-start; }
  .avatar { width:32px; height:32px; border-radius:50%; flex-shrink:0; }
  .body   { flex:1; }
  .author { font-weight:600; color:#fff; margin-right:8px; }
  .time   { font-size:11px; color:#72767d; }
  .content{ margin-top:4px; font-size:14px; line-height:1.5; word-break:break-word; }
</style>
</head>
<body>
<h1>Ticket #${ticketDoc.ticketId}</h1>
<div class="meta">
  Channel: #${channel.name} &nbsp;|&nbsp;
  Category: ${escapeHtml(ticketDoc.category || 'General')} &nbsp;|&nbsp;
  Messages: ${messages.length} &nbsp;|&nbsp;
  Generated: ${new Date().toLocaleString()}
</div>
${rows}
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

module.exports = { generate };
