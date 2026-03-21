'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info, neutral, warning, modEmbed, confirmEmbed } = require("../utils/embedBuilder");
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }      = require('../utils/permissions');
const { parseWithBounds } = require('../utils/timeParser');
const { paginate }       = require('../utils/paginator');
const { single }         = require('../utils/buttonBuilder');
const { ButtonStyle }    = require('discord.js');
const Event = require('../models/Event');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Server event system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a server event')
      .addStringOption(o => o.setName('title').setDescription('Event title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Event description').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Announcement channel').setRequired(true))
      .addStringOption(o => o.setName('starts_in').setDescription('When the event starts e.g. 2h, 1d'))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners to pick at end')))
    .addSubcommand(s => s
      .setName('cancel')
      .setDescription('Cancel an event')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('edit')
      .setDescription('Edit an event title or description')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('New title'))
      .addStringOption(o => o.setName('description').setDescription('New description')))
    .addSubcommand(s => s.setName('list').setDescription('List active events'))
    .addSubcommand(s => s
      .setName('join')
      .setDescription('Join an event RSVP')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('leave')
      .setDescription('Leave an event RSVP')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('remind')
      .setDescription('Set a reminder for an event')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true))
      .addStringOption(o => o.setName('before').setDescription('How far before the event e.g. 30m, 1h').setRequired(true)))
    .addSubcommand(s => s
      .setName('winners')
      .setDescription('Pick winners from event RSVPs')
      .addStringOption(o => o.setName('id').setDescription('Event ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const title    = interaction.options.getString('title');
      const desc     = interaction.options.getString('description');
      const channel  = interaction.options.getChannel('channel');
      const startsIn = interaction.options.getString('starts_in');
      const winners  = interaction.options.getInteger('winners') || 0;
      let   startsAt = null;
      if (startsIn) {
        const dur = parseWithBounds(startsIn, { min: 60000, max: 30 * 24 * 60 * 60 * 1000 });
        if (!dur.valid) return errorReply(interaction, dur.reason);
        startsAt = new Date(Date.now() + dur.ms);
      }
      await interaction.deferReply({ ephemeral: true });
      const row   = single('event_join', '✅ Join Event', ButtonStyle.Success);
      const embed = info(`${desc}${startsAt ? `\n\n**Starts:** <t:${Math.floor(startsAt.getTime() / 1000)}:R>` : ''}\n**RSVP:** 0`, title);
      const msg   = await channel.send({ embeds: [embed], components: [row] });
      const event = await Event.create({
        guildId: interaction.guild.id, hostId: interaction.user.id,
        title, description: desc, channelId: channel.id,
        messageId: msg.id, startsAt, winnersCount: winners,
      });
      await interaction.editReply({ embeds: [success(`Event **${title}** created in <#${channel.id}>!\nID: \`${event._id}\``)] });
    }

    else if (sub === 'cancel') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const event = await Event.findOneAndUpdate({ _id: interaction.options.getString('id'), guildId: interaction.guild.id }, { ended: true });
      if (!event) return errorReply(interaction, 'Event not found.');
      await interaction.reply({ embeds: [success(`Event **${event.title}** cancelled.`)], ephemeral: true });
    }

    else if (sub === 'edit') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const id    = interaction.options.getString('id');
      const event = await Event.findOne({ _id: id, guildId: interaction.guild.id });
      if (!event) return errorReply(interaction, 'Event not found.');
      const newTitle = interaction.options.getString('title');
      const newDesc  = interaction.options.getString('description');
      if (newTitle) event.title       = newTitle;
      if (newDesc)  event.description = newDesc;
      await event.save();
      await interaction.reply({ embeds: [success('Event updated.')], ephemeral: true });
    }

    else if (sub === 'list') {
      const events = await Event.find({ guildId: interaction.guild.id, ended: false }).sort({ startsAt: 1 });
      if (!events.length) return interaction.reply({ embeds: [info('No active events.')], ephemeral: true });
      const lines = events.map(e => `\`${e._id}\` **${e.title}** — ${e.rsvp.length} RSVPs${e.startsAt ? ` — starts <t:${Math.floor(e.startsAt.getTime() / 1000)}:R>` : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 8) pages.push(neutral(lines.slice(i, i + 8).join('\n'), 'Active Events'));
      await paginate(interaction, pages);
    }

    else if (sub === 'join') {
      const event = await Event.findOne({ _id: interaction.options.getString('id'), guildId: interaction.guild.id, ended: false });
      if (!event) return errorReply(interaction, 'Event not found.');
      if (event.rsvp.includes(interaction.user.id)) return errorReply(interaction, 'You have already joined this event.');
      event.rsvp.push(interaction.user.id);
      await event.save();
      await interaction.reply({ embeds: [success(`You joined **${event.title}**! RSVP count: ${event.rsvp.length}`)], ephemeral: true });
    }

    else if (sub === 'leave') {
      const event = await Event.findOne({ _id: interaction.options.getString('id'), guildId: interaction.guild.id, ended: false });
      if (!event) return errorReply(interaction, 'Event not found.');
      if (!event.rsvp.includes(interaction.user.id)) return errorReply(interaction, 'You have not joined this event.');
      event.rsvp = event.rsvp.filter(id => id !== interaction.user.id);
      await event.save();
      await interaction.reply({ embeds: [success(`You left **${event.title}**.`)], ephemeral: true });
    }

    else if (sub === 'remind') {
      await interaction.reply({ embeds: [info('Event reminders are sent automatically before the start time.\nSet the start time using `/event create` with the `starts_in` option.')], ephemeral: true });
    }

    else if (sub === 'winners') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const event = await Event.findOne({ _id: interaction.options.getString('id'), guildId: interaction.guild.id });
      if (!event) return errorReply(interaction, 'Event not found.');
      if (event.rsvp.length === 0) return errorReply(interaction, 'No RSVP entries to pick from.');
      const count   = event.winnersCount || 1;
      const pool    = [...event.rsvp];
      const winners = [];
      while (winners.length < Math.min(count, pool.length)) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }
      event.winners = winners;
      event.ended   = true;
      await event.save();
      await interaction.reply({ embeds: [success(`**Winners of ${event.title}:**\n${winners.map(id => `<@${id}>`).join(', ')}`)] });
    }
  },
};
