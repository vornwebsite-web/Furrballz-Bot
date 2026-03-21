'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { success, error, info, neutral, warning, buildEmbed } = require('../utils/embedBuilder');
const { errorReply } = require('../utils/errors');
const { number, ordinal, relativeTime } = require('../utils/formatters');
const { paginate } = require('../utils/paginator');
const economyService = require('../services/economyService');
const Guild = require('../models/Guild');

module.exports = {
  cooldown: 2000,
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Economy system')
    .addSubcommand(s => s
      .setName('balance')
      .setDescription('Check your or another user\'s balance')
      .addUserOption(o => o.setName('user').setDescription('User to check')))
    .addSubcommand(s => s.setName('daily').setDescription('Claim your daily reward'))
    .addSubcommand(s => s.setName('work').setDescription('Work to earn coins'))
    .addSubcommand(s => s
      .setName('pay')
      .setDescription('Pay another user')
      .addUserOption(o => o.setName('user').setDescription('User to pay').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to pay').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('leaderboard').setDescription('View the richest members'))
    .addSubcommand(s => s.setName('shop').setDescription('View the server shop'))
    .addSubcommand(s => s
      .setName('buy')
      .setDescription('Buy an item from the shop')
      .addStringOption(o => o.setName('item_id').setDescription('Item ID to buy').setRequired(true))),

  async execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildDoc = await Guild.getOrCreate(interaction.guild.id);
    const currency = guildDoc.economy?.currencyEmoji || '🪙';

    if (sub === 'balance') {
      const target  = interaction.options.getUser('user') || interaction.user;
      const { balance, bank } = await economyService.getBalance(target.id, interaction.guild.id);
      await interaction.reply({ embeds: [buildEmbed({
        type:   'economy',
        title:  `${target.username}'s Balance`,
        fields: [
          { name: `${currency} Wallet`, value: number(balance), inline: true },
          { name: `${currency} Bank`,   value: number(bank),    inline: true },
          { name: `${currency} Total`,  value: number(balance + bank), inline: true },
        ],
        thumbnail: target.displayAvatarURL(),
      })] });
    }

    else if (sub === 'daily') {
      const result = await economyService.claimDaily(interaction.user.id, interaction.guild.id, guildDoc);
      if (!result.success) {
        return interaction.reply({ embeds: [error(`You already claimed your daily reward! Come back ${relativeTime(result.nextAt)}.`)], ephemeral: true });
      }
      await interaction.reply({ embeds: [success(`You claimed your daily reward of **${currency} ${number(result.amount)}**!\nNew balance: **${currency} ${number(result.newBalance)}**`)] });
    }

    else if (sub === 'work') {
      const result = await economyService.claimWork(interaction.user.id, interaction.guild.id, guildDoc);
      if (!result.success) {
        return interaction.reply({ embeds: [error(`You already worked recently! Come back ${relativeTime(result.nextAt)}.`)], ephemeral: true });
      }
      const jobs = ['writing code', 'delivering packages', 'walking dogs', 'flipping burgers', 'teaching classes', 'fixing bugs', 'designing logos'];
      const job  = jobs[Math.floor(Math.random() * jobs.length)];
      await interaction.reply({ embeds: [success(`You earned **${currency} ${number(result.amount)}** from ${job}!\nNew balance: **${currency} ${number(result.newBalance)}**`)] });
    }

    else if (sub === 'pay') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (target.id === interaction.user.id) return errorReply(interaction, 'You cannot pay yourself.');
      if (target.bot) return errorReply(interaction, 'You cannot pay a bot.');
      const result = await economyService.transfer(interaction.user.id, target.id, interaction.guild.id, amount);
      if (!result.success) return errorReply(interaction, result.reason);
      await interaction.reply({ embeds: [success(`You paid **${currency} ${number(amount)}** to <@${target.id}>.`)] });
    }

    else if (sub === 'leaderboard') {
      const top   = await economyService.getLeaderboard(interaction.guild.id);
      const lines = top.map((u, i) => `${ordinal(i + 1)}. <@${u.userId}> — ${currency} ${number(u.balance)}`);
      await paginate(interaction, [neutral(lines.join('\n') || 'No data yet.', 'Richest Members')]);
    }

    else if (sub === 'shop') {
      const ShopItem = require('../models/ShopItem');
      const items    = await ShopItem.find({ guildId: interaction.guild.id, enabled: true });
      if (items.length === 0) return interaction.reply({ embeds: [info('The shop is empty.')], ephemeral: true });
      const lines = items.map(i => `**${i.name}** — ${currency} ${number(i.price)}\n${i.description || ''}\nID: \`${i._id}\`${i.stock > -1 ? ` | Stock: ${i.stock}` : ''}`);
      const pages = [];
      for (let i = 0; i < lines.length; i += 5) pages.push(neutral(lines.slice(i, i + 5).join('\n\n'), 'Server Shop'));
      await paginate(interaction, pages);
    }

    else if (sub === 'buy') {
      const itemId = interaction.options.getString('item_id');
      const result = await economyService.buyItem(interaction.user.id, interaction.guild.id, itemId, interaction.guild);
      if (!result.success) return errorReply(interaction, result.reason);
      await interaction.reply({ embeds: [success(`You bought **${result.item.name}** for ${currency} ${number(result.item.price)}!\nNew balance: **${currency} ${number(result.newBalance)}**`)] });
    }
  },
};
