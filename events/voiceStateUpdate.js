'use strict';

// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────

const { Events } = require('discord.js');
const logService      = require('../services/logService');
const tempVoiceService = require('../services/tempVoiceService');
const Guild           = require('../models/Guild');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    if (!newState.guild) return;
    const guild = await Guild.getOrCreate(newState.guild.id);
    const member = newState.member || oldState.member;

    // ── Temp voice — trigger channel joined ───────────────────────────────────
    if (
      guild.tempVoiceTriggerChannelId &&
      newState.channelId === guild.tempVoiceTriggerChannelId
    ) {
      try {
        await tempVoiceService.createChannel(member, guild, client);
      } catch { /* ignore */ }
    }

    // ── Temp voice — channel empty, delete it ─────────────────────────────────
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      try {
        await tempVoiceService.checkEmpty(oldState.channelId, newState.guild, client);
      } catch { /* ignore */ }
    }

    // ── Log voice state changes ───────────────────────────────────────────────
    try {
      if (!guild.logChannels?.voiceUpdate) return;

      const joined = !oldState.channelId && newState.channelId;
      const left   = oldState.channelId  && !newState.channelId;
      const moved  = oldState.channelId  && newState.channelId && oldState.channelId !== newState.channelId;

      if (!joined && !left && !moved) return;

      const action = joined ? 'Joined VC' : left ? 'Left VC' : 'Moved VC';
      const color  = joined ? 'success'   : left  ? 'error'   : 'info';

      const fields = [
        { name: 'Member', value: `<@${member?.id}> (${member?.user?.tag})`, inline: true },
      ];

      if (joined) fields.push({ name: 'Channel', value: `<#${newState.channelId}>`, inline: true });
      if (left)   fields.push({ name: 'Channel', value: `<#${oldState.channelId}>`, inline: true });
      if (moved) {
        fields.push({ name: 'From', value: `<#${oldState.channelId}>`, inline: true });
        fields.push({ name: 'To',   value: `<#${newState.channelId}>`, inline: true });
      }

      await logService.send(client, guild.logChannels.voiceUpdate, {
        type: 'voiceUpdate', color, title: action, fields,
      });
    } catch { /* ignore */ }
  },
};
