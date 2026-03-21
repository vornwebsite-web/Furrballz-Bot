'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ButtonStyle } = require('discord.js');
const { success, info, neutral } = require('../utils/embedBuilder');
const { errorReply, noPermission } = require('../utils/errors');
const { isManager }    = require('../utils/permissions');
const { paginate }     = require('../utils/paginator');
const { single }       = require('../utils/buttonBuilder');
const Raffle           = require('../models/Raffle');

module.exports = {
  cooldown: 3000,
  data: new SlashCommandBuilder()
    .setName('raffle')
    .setDescription('Raffle system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Create a raffle')
      .addStringOption(o => o.setName('prize').setDescription('Raffle prize').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post raffle')))
    .addSubcommand(s => s
      .setName('enter')
      .setDescription('Enter a raffle')
      .addStringOption(o => o.setName('id').setDescription('Raffle ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('draw')
      .setDescription('Draw a winner from a raffle')
      .addStringOption(o => o.setName('id').setDescription('Raffle ID').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(10)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('List active raffles'))
    .addSubcommand(s => s
      .setName('cancel')
      .setDescription('Cancel a raffle')
      .addStringOption(o => o.setName('id').setDescription('Raffle ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('winners')
      .setDescription('View winners of a drawn raffle')
      .addStringOption(o => o.setName('id').setDescription('Raffle ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const prize   = interaction.options.getString('prize');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await interaction.deferReply({ ephemeral: true });
      const embed = info(`**Prize:** ${prize}\n**Entries:** 0\n\nClick the button below to enter!`, '🎟️ Raffle');
      const row   = single('raffle_enter', '🎟️ Enter Raffle', ButtonStyle.Primary);
      const msg   = await channel.send({ embeds: [embed], components: [row] });
      const raffle = await Raffle.create({
        guildId: interaction.guild.id, channelId: channel.id,
        messageId: msg.id, hostId: interaction.user.id, prize,
      });
      await interaction.editReply({ embeds: [success(`Raffle created in <#${channel.id}>!\nID: \`${raffle._id}\`\nPrize: **${prize}**`)] });
    }

    else if (sub === 'enter') {
      const id     = interaction.options.getString('id');
      const raffle = await Raffle.findOne({ _id: id, guildId: interaction.guild.id, drawn: false, cancelled: false });
      if (!raffle) return errorReply(interaction, 'Raffle not found or already drawn.');
      if (raffle.entries.includes(interaction.user.id)) return errorReply(interaction, 'You have already entered this raffle.');
      raffle.entries.push(interaction.user.id);
      await raffle.save();
      await interaction.reply({ embeds: [success(`You entered the raffle for **${raffle.prize}**! Total entries: ${raffle.entries.length}`)], ephemeral: true });
    }

    else if (sub === 'draw') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const id      = interaction.options.getString('id');
      const count   = interaction.options.getInteger('winners') || 1;
      const raffle  = await Raffle.findOne({ _id: id, guildId: interaction.guild.id, drawn: false, cancelled: false });
      if (!raffle) return errorReply(interaction, 'Raffle not found or already drawn.');
      if (raffle.entries.length === 0) return errorReply(interaction, 'No entries in this raffle.');
      const pool    = [...raffle.entries];
      const winners = [];
      while (winners.length < Math.min(count, pool.length)) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }
      raffle.winners = winners;
      raffle.drawn   = true;
      await raffle.save();
      const winnerText = winners.map(id => `<@${id}>`).join(', ');
      const channel    = await interaction.client.channels.fetch(raffle.channelId).catch(() => null);
      if (channel) await channel.send({ content: `🎉 The raffle for **${raffle.prize}** has been drawn!\n**Winner(s):** ${winnerText}`, allowedMentions: { users: winners } });
      await interaction.reply({ embeds: [success(`Winners drawn!\n**Prize:** ${raffle.prize}\n**Winners:** ${winnerText}`)] });
    }

    else if (sub === 'list') {
      const raffles = await Raffle.find({ guildId: interaction.guild.id, drawn: false, cancelled: false });
      if (!raffles.length) return interaction.reply({ embeds: [info('No active raffles.')], ephemeral: true });
      const lines = raffles.map(r => `\`${r._id}\` **${r.prize}** — ${r.entries.length} entries`);
      await paginate(interaction, [neutral(lines.join('\n'), 'Active Raffles')]);
    }

    else if (sub === 'cancel') {
      if (!isManager(interaction.member)) return noPermission(interaction);
      const raffle = await Raffle.findOneAndUpdate({ _id: interaction.options.getString('id'), guildId: interaction.guild.id }, { cancelled: true });
      if (!raffle) return errorReply(interaction, 'Raffle not found.');
      await interaction.reply({ embeds: [success(`Raffle for **${raffle.prize}** cancelled.`)], ephemeral: true });
    }

    else if (sub === 'winners') {
      const raffle = await Raffle.findOne({ _id: interaction.options.getString('id'), guildId: interaction.guild.id, drawn: true });
      if (!raffle) return errorReply(interaction, 'Drawn raffle not found.');
      await interaction.reply({ embeds: [info(`**Prize:** ${raffle.prize}\n**Winners:** ${raffle.winners.map(id => `<@${id}>`).join(', ') || 'None'}`, 'Raffle Winners')] });
    }
  },
};
